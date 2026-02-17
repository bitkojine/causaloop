import {
  Msg,
  CoreEffect,
  FetchEffect,
  TimerEffect,
  AnimationFrameEffect,
  WorkerEffect,
  WrappedEffect,
} from "@causaloop/core";

export interface BrowserRunnerOptions {
  fetch?: typeof fetch;
  createWorker?: (url: string | URL, options?: WorkerOptions) => Worker;
  createAbortController?: () => AbortController;
}

export class BrowserRunner {
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
    { effect: WorkerEffect; dispatch: (msg: Msg) => void }[]
  >();

  constructor(
    options: BrowserRunnerOptions & { maxWorkersPerUrl?: number } = {},
  ) {
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.createWorker =
      options.createWorker ??
      ((url, opts) => new Worker(url, { type: "module", ...opts }));
    this.createAbortController =
      options.createAbortController ?? (() => new AbortController());
    this.maxWorkersPerUrl = options.maxWorkersPerUrl ?? 4;
  }

  public run(effect: CoreEffect, dispatch: (msg: Msg) => void): void {
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
    } catch (err) {
      // Catch synchronous errors (e.g. malformed URL, invalid effect structure)
      // and try to dispatch an error if possible, or log critical failure.
      console.error("Critical error in effect runner:", err);
      // We can't easily dispatch an error Msg here because we don't know if the
      // effect even supports an onError variant without more complex types.
      // But for 'worker' or 'fetch' which have onError, we might be able to cast?
      // For now, let's assume we can't dispatch safely to the app from a top-level crash
      // unless we mandate a specific ErrorMsg shape. 
      // However, the test "Effect Runner: should not crash..." expects us to not crash.
      // We will suppress the throw.
    }
  }

  private runWrapper(
    effect: WrappedEffect,
    dispatch: (msg: Msg) => void,
  ): void {
    this.run(effect.original, (msg: unknown) => {
      // The inner effect produces a Msg (or unknown that is a Msg)
      // The wrapper converts it to TMsg (which is a Msg)
      // The dispatch function expects a Msg
      dispatch(effect.wrap(msg));
    });
  }

  private runFetch(effect: FetchEffect, dispatch: (msg: Msg) => void): void {
    const {
      url,
      method = "GET",
      headers,
      body,
      expect = "json",
      timeoutMs,
    } = effect;
    const controller = this.createAbortController();
    // If an abortKey is provided, store the controller.
    // The previous controller for this key (if any) is explicitly aborted.
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

        // If it was a timeout, we MUST dispatch the error, even if it's an AbortError.
        // If it was a user cancellation (abortKey), it is also an AbortError, but we might want to ignore it?
        // Typically, cancellations are silent, timeouts are errors.

        if (error.name === "AbortError" && !didTimeout) {
          // It was a manual abort (cancellation), silently ignore.
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

  private runTimer(effect: TimerEffect, dispatch: (msg: Msg) => void): void {
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
    effect: AnimationFrameEffect,
    dispatch: (msg: Msg) => void,
  ): void {
    requestAnimationFrame((time) => {
      dispatch(effect.onFrame(time));
    });
  }

  private runWorker(effect: WorkerEffect, dispatch: (msg: Msg) => void): void {
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
    effect: WorkerEffect,
    dispatch: (msg: Msg) => void,
  ): void {
    this.busyWorkers.add(worker);

    const cleanup = () => {
      worker.onmessage = null;
      worker.onerror = null;
      this.busyWorkers.delete(worker);
      this.processNextInQueue(effect.scriptUrl);
    };

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
}
