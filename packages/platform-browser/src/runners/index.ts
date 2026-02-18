import {
  Msg,
  CoreEffect,
  FetchEffect,
  TimerEffect,
  AnimationFrameEffect,
  WorkerEffect,
  WrappedEffect,
  Subscription,
  TimerSubscription,
  AnimationFrameSubscription,
} from "@causaloop/core";
export interface BrowserRunnerOptions {
  fetch?: typeof fetch;
  createWorker?: (url: string | URL, options?: WorkerOptions) => Worker;
  createAbortController?: () => AbortController;
}
export class BrowserRunner<TMsg extends Msg = Msg> {
  private controllers = new Map<string, AbortController>();
  private readonly fetch: typeof fetch;
  private readonly createWorker: (
    url: string | URL,
    options?: WorkerOptions,
  ) => Worker;
  private readonly createAbortController: () => AbortController;
  private readonly maxWorkersPerUrl: number;
  private workersByUrl = new Map<string, Worker[]>();
  private busyWorkers = new Set<Worker>();
  private workerQueue = new Map<
    string,
    {
      effect: WorkerEffect<TMsg>;
      dispatch: (msg: TMsg) => void;
    }[]
  >();
  constructor(
    options: BrowserRunnerOptions & {
      maxWorkersPerUrl?: number;
    } = {},
  ) {
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.createWorker =
      options.createWorker ??
      ((url, opts) => new Worker(url, { type: "module", ...opts }));
    this.createAbortController =
      options.createAbortController ?? (() => new AbortController());
    this.maxWorkersPerUrl = options.maxWorkersPerUrl ?? 4;
  }
  public run(effect: CoreEffect<TMsg>, dispatch: (msg: TMsg) => void): void {
    try {
      switch (effect.kind) {
        case "fetch":
          this.runFetch(effect, dispatch);
          break;
        case "timer":
          this.runTimer(effect, dispatch);
          break;
        case "cancel":
          this.runCancel(effect);
          break;
        case "animationFrame":
          this.runAnimationFrame(effect, dispatch);
          break;
        case "worker":
          this.runWorker(effect, dispatch);
          break;
        case "wrapper":
          this.runWrapper(effect, dispatch);
          break;
      }
    } catch (_err) {
      // Critical error in effect runner silently ignored as per zero-console policy
    }
  }
  private runWrapper(
    effect: WrappedEffect<TMsg>,
    dispatch: (msg: TMsg) => void,
  ): void {
    this.run(effect.original as CoreEffect<TMsg>, (msg: TMsg) => {
      dispatch(effect.wrap(msg) as TMsg);
    });
  }
  private runFetch(
    effect: FetchEffect<TMsg>,
    dispatch: (msg: TMsg) => void,
  ): void {
    const {
      url,
      method = "GET",
      headers,
      body,
      expect = "json",
      timeoutMs,
    } = effect;
    const controller = this.createAbortController();
    if (effect.abortKey) {
      if (this.controllers.has(effect.abortKey)) {
        this.controllers.get(effect.abortKey)?.abort();
      }
      this.controllers.set(effect.abortKey, controller);
    }
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let didTimeout = false;
    if (timeoutMs) {
      timeoutId = setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, timeoutMs);
    }
    const fetchOptions: RequestInit = {
      method,
      signal: controller.signal,
    };
    if (headers) fetchOptions.headers = headers;
    if (body) fetchOptions.body = body;
    this.fetch(url, fetchOptions)
      .then(async (response) => {
        if (timeoutId) clearTimeout(timeoutId);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data =
          expect === "json" ? await response.json() : await response.text();
        dispatch(effect.onSuccess(data as unknown));
      })
      .catch((error) => {
        if (timeoutId) clearTimeout(timeoutId);
        if (error.name === "AbortError" && !didTimeout) {
          return;
        }
        dispatch(effect.onError(error));
      })
      .finally(() => {
        if (
          effect.abortKey &&
          this.controllers.get(effect.abortKey) === controller
        ) {
          this.controllers.delete(effect.abortKey);
        }
      });
  }
  private runTimer(
    effect: TimerEffect<TMsg>,
    dispatch: (msg: TMsg) => void,
  ): void {
    setTimeout(() => {
      dispatch(effect.onTimeout());
    }, effect.timeoutMs);
  }
  private runCancel(effect: { readonly abortKey: string }): void {
    const controller = this.controllers.get(effect.abortKey);
    if (controller) {
      controller.abort();
      this.controllers.delete(effect.abortKey);
    }
  }
  private runAnimationFrame(
    effect: AnimationFrameEffect<TMsg>,
    dispatch: (msg: TMsg) => void,
  ): void {
    requestAnimationFrame((time) => {
      dispatch(effect.onFrame(time));
    });
  }
  private runWorker(
    effect: WorkerEffect<TMsg>,
    dispatch: (msg: TMsg) => void,
  ): void {
    const { scriptUrl } = effect;
    let pool = this.workersByUrl.get(scriptUrl);
    if (!pool) {
      pool = [];
      this.workersByUrl.set(scriptUrl, pool);
    }
    const idleWorker = pool.find((w) => !this.busyWorkers.has(w));
    if (idleWorker) {
      this.executeOnWorker(idleWorker, effect, dispatch);
    } else if (pool.length < this.maxWorkersPerUrl) {
      const newWorker = this.createWorker(scriptUrl);
      pool.push(newWorker);
      this.executeOnWorker(newWorker, effect, dispatch);
    } else {
      let queue = this.workerQueue.get(scriptUrl);
      if (!queue) {
        queue = [];
        this.workerQueue.set(scriptUrl, queue);
      }
      queue.push({ effect, dispatch });
    }
  }
  private executeOnWorker(
    worker: Worker,
    effect: WorkerEffect<TMsg>,
    dispatch: (msg: TMsg) => void,
  ): void {
    this.busyWorkers.add(worker);
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      worker.onmessage = null;
      worker.onerror = null;
      this.busyWorkers.delete(worker);
      this.processNextInQueue(effect.scriptUrl);
    };
    if (effect.timeoutMs) {
      timeoutId = setTimeout(() => {
        worker.terminate();
        this.busyWorkers.delete(worker);
        const pool = this.workersByUrl.get(effect.scriptUrl);
        if (pool) {
          const idx = pool.indexOf(worker);
          if (idx !== -1) {
            pool[idx] = this.createWorker(effect.scriptUrl);
          }
        }
        worker.onmessage = null;
        worker.onerror = null;
        dispatch(
          effect.onError(
            new Error(
              `Worker timed out after ${effect.timeoutMs}ms. The computation took too long. Try a smaller input.`,
            ),
          ),
        );
        this.processNextInQueue(effect.scriptUrl);
      }, effect.timeoutMs);
    }
    worker.onmessage = (e: MessageEvent) => {
      dispatch(effect.onSuccess(e.data));
      cleanup();
    };
    worker.onerror = (e: ErrorEvent) => {
      const errorMsg = `Worker error: ${e.message} at ${e.filename}:${e.lineno}`;
      dispatch(effect.onError(new Error(errorMsg)));
      cleanup();
    };
    worker.postMessage(effect.payload);
  }
  private processNextInQueue(scriptUrl: string): void {
    const queue = this.workerQueue.get(scriptUrl);
    if (queue && queue.length > 0) {
      const pool = this.workersByUrl.get(scriptUrl);
      const idleWorker = pool?.find((w) => !this.busyWorkers.has(w));
      if (idleWorker) {
        const next = queue.shift()!;
        this.executeOnWorker(idleWorker, next.effect, next.dispatch);
      }
    }
  }
  private activeSubscriptions = new Map<string, { cancel: () => void }>();
  public startSubscription(
    sub: Subscription<TMsg>,
    dispatch: (msg: TMsg) => void,
  ): void {
    this.stopSubscription(sub.key);
    switch (sub.kind) {
      case "timer": {
        const timerSub = sub as TimerSubscription<TMsg>;
        const id = setInterval(() => {
          dispatch(timerSub.onTick());
        }, timerSub.intervalMs);
        this.activeSubscriptions.set(sub.key, {
          cancel: () => clearInterval(id),
        });
        break;
      }
      case "animationFrame": {
        const animSub = sub as AnimationFrameSubscription<TMsg>;
        let active = true;
        const loop = (time: number) => {
          if (!active) return;
          dispatch(animSub.onFrame(time));
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
        this.activeSubscriptions.set(sub.key, {
          cancel: () => {
            active = false;
          },
        });
        break;
      }
    }
  }
  public stopSubscription(key: string): void {
    const entry = this.activeSubscriptions.get(key);
    if (entry) {
      entry.cancel();
      this.activeSubscriptions.delete(key);
    }
  }
}
