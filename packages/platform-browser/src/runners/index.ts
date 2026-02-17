import {
  Msg,
  CoreEffect,
  FetchEffect,
  TimerEffect,
  AnimationFrameEffect,
  WorkerEffect,
  WrappedEffect,
} from "@causaloop/core";

export class BrowserRunner {
  private controllers = new Map<string, AbortController>();

  public run(effect: CoreEffect, dispatch: (msg: Msg) => void): void {
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
  }

  private runWrapper(effect: WrappedEffect, dispatch: (msg: Msg) => void): void {
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
    const controller = new AbortController();
    // If an abortKey is provided, store the controller.
    // The previous controller for this key (if any) is implicitly replaced.
    // Cancellation of previous requests with the same key should be handled by a 'cancel' effect.
    if (effect.abortKey) {
      this.controllers.set(effect.abortKey, controller);
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (timeoutMs) {
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }

    const fetchOptions: RequestInit = {
      method,
      signal: controller.signal,
    };
    if (headers) fetchOptions.headers = headers;
    if (body) fetchOptions.body = body;

    fetch(url, fetchOptions)
      .then(async (response) => {
        if (timeoutId) clearTimeout(timeoutId);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const data =
          expect === "json" ? await response.json() : await response.text();
        dispatch(effect.onSuccess(data as unknown));
      })
      .catch((error) => {
        if (Object.isFrozen(error)) {
          // Some fetch errors might be frozen? Unlikely but safe.
        }
        if (timeoutId) clearTimeout(timeoutId);
        if (error.name === "AbortError") return;
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
    const worker = new Worker(effect.scriptUrl, { type: "module" });
    worker.onmessage = (e: MessageEvent) => {
      dispatch(effect.onSuccess(e.data));
      worker.terminate();
    };
    worker.onerror = () => {
      dispatch(effect.onError(new Error("Worker error")));
      worker.terminate();
    };
    worker.postMessage(effect.payload);
  }
}
