import {
  Model,
  Msg,
  Effect,
  UpdateFn,
  Snapshot,
  TimeProvider,
  RandomProvider,
  MsgLogEntry,
} from "./types.js";
export interface DispatcherOptions<
  M extends Model,
  G extends Msg,
  E extends Effect,
> {
  readonly model: M;
  readonly update: UpdateFn<M, G, E>;
  readonly effectRunner: (effect: E, dispatch: (msg: G) => void) => void;
  readonly onCommit?: (snapshot: Snapshot<M>) => void;
  readonly assertInvariants?: (model: M) => void;
  readonly devMode?: boolean;
  readonly timeProvider?: TimeProvider;
  readonly randomProvider?: RandomProvider;
}
export interface Dispatcher<M extends Model, G extends Msg> {
  dispatch(msg: G): void;
  getSnapshot(): Snapshot<M>;
  subscribe(callback: (snapshot: Snapshot<M>) => void): () => void;
  shutdown(): void;
  getMsgLog(): readonly MsgLogEntry[];
}
export function createDispatcher<
  M extends Model,
  G extends Msg,
  E extends Effect,
>(options: DispatcherOptions<M, G, E>): Dispatcher<M, G> {
  let currentModel = options.model;
  let isProcessing = false;
  const queue: G[] = [];
  const msgLog: MsgLogEntry[] = [];
  const subscribers = new Set<(snapshot: Snapshot<M>) => void>();
  let isShutdown = false;
  let pendingNotify = false;
  const time = options.timeProvider || { now: () => Date.now() };
  const deepFreeze = (obj: unknown): unknown => {
    if (
      options.devMode &&
      obj &&
      typeof obj === "object" &&
      !Object.isFrozen(obj)
    ) {
      Object.freeze(obj);
      Object.getOwnPropertyNames(obj).forEach((prop) => {
        const value = (obj as Record<string, unknown>)[prop];
        deepFreeze(value);
      });
    }
    return obj;
  };
  if (options.devMode) {
    deepFreeze(currentModel);
  }
  const notifySubscribers = () => {
    if (pendingNotify || isShutdown) return;
    pendingNotify = true;
    void Promise.resolve().then(() => {
      if (isShutdown) return;
      pendingNotify = false;
      const snapshot = currentModel as Snapshot<M>;
      options.onCommit?.(snapshot);
      subscribers.forEach((cb) => cb(snapshot));
    });
  };
  const processQueue = () => {
    if (isProcessing || isShutdown || queue.length === 0) return;
    isProcessing = true;
    try {
      while (queue.length > 0) {
        const msg = queue.shift()!;
        msgLog.push({ msg, ts: time.now() });
        const { model: nextModel, effects } = options.update(currentModel, msg);
        if (options.devMode) {
          options.assertInvariants?.(nextModel);
          deepFreeze(nextModel);
        }
        currentModel = nextModel;
        effects.forEach((effect) => {
          options.effectRunner(effect, dispatch);
        });
      }
      notifySubscribers();
    } finally {
      isProcessing = false;
    }
  };
  function dispatch(msg: G) {
    if (isShutdown) return;
    queue.push(msg);
    if (!isProcessing) {
      processQueue();
    }
  }
  return {
    dispatch,
    getSnapshot: () => currentModel as Snapshot<M>,
    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    shutdown: () => {
      isShutdown = true;
      subscribers.clear();
      queue.length = 0;
    },
    getMsgLog: () => msgLog,
  };
}
