import {
  Model,
  Msg,
  Effect,
  UpdateFn,
  Snapshot,
  TimeProvider,
  RandomProvider,
  MsgLogEntry,
  UpdateContext,
  Entropy,
} from "./types.js";
import { Subscription, diffSubscriptions } from "./subscriptions.js";
export interface DispatcherOptions<
  M extends Model,
  G extends Msg,
  E extends Effect,
> {
  readonly model: M;
  readonly update: UpdateFn<M, G, E>;
  readonly effectRunner: (effect: E, dispatch: (msg: G) => void) => void;
  readonly subscriptions?: (model: Snapshot<M>) => readonly Subscription<G>[];
  readonly subscriptionRunner?: {
    start: (sub: Subscription<G>, dispatch: (msg: G) => void) => void;
    stop: (key: string) => void;
  };
  readonly onCommit?: (snapshot: Snapshot<M>) => void;
  readonly assertInvariants?: (model: M) => void;
  readonly devMode?: boolean;
  readonly timeProvider?: TimeProvider;
  readonly randomProvider?: RandomProvider;
  readonly maxLogSize?: number;
  readonly initialLog?: readonly MsgLogEntry[];
}
export interface Dispatcher<M extends Model, G extends Msg> {
  dispatch(msg: G): void;
  getSnapshot(): Snapshot<M>;
  getReplayableState(): { log: readonly MsgLogEntry[]; snapshot: Snapshot<M> };
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
  const msgLog: MsgLogEntry[] = options.initialLog
    ? [...options.initialLog]
    : [];
  const subscribers = new Set<(snapshot: Snapshot<M>) => void>();
  let isShutdown = false;
  let pendingNotify = false;
  const time = options.timeProvider || { now: () => Date.now() };
  const maxLogSize = options.maxLogSize ?? 10000;
  let activeSubs: readonly Subscription<G>[] = [];
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
  const reconcileSubscriptions = () => {
    if (!options.subscriptions || !options.subscriptionRunner) return;
    const newSubs = options.subscriptions(currentModel as Snapshot<M>);
    const { toStart, toStop } = diffSubscriptions(activeSubs, newSubs);
    toStop.forEach((key) => options.subscriptionRunner!.stop(key));
    toStart.forEach((sub) => options.subscriptionRunner!.start(sub, dispatch));
    activeSubs = newSubs;
  };
  const notifySubscribers = () => {
    if (pendingNotify || isShutdown) return;
    pendingNotify = true;
    void Promise.resolve().then(() => {
      if (isShutdown) return;
      pendingNotify = false;
      const snapshot = currentModel as Snapshot<M>;
      options.onCommit?.(snapshot);
      subscribers.forEach((cb) => cb(snapshot));
      reconcileSubscriptions();
    });
  };
  const processQueue = () => {
    if (isProcessing || isShutdown || queue.length === 0) return;
    isProcessing = true;
    try {
      while (queue.length > 0) {
        const msg = queue.shift()!;
        const ts = time.now();
        const recordedRandoms: number[] = [];

        const ctx: UpdateContext = {
          random: () => {
            const r = options.randomProvider
              ? options.randomProvider.random()
              : Math.random();
            recordedRandoms.push(r);
            return r;
          },
          now: () => ts,
        };

        const { model: nextModel, effects } = options.update(
          currentModel,
          msg,
          ctx,
        );

        msgLog.push({
          msg,
          ts,
          ...(recordedRandoms.length > 0
            ? { entropy: { random: recordedRandoms } }
            : {}),
        });

        if (msgLog.length > maxLogSize) {
          msgLog.shift();
        }

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
  reconcileSubscriptions();
  return {
    dispatch,
    getSnapshot: () => currentModel as Snapshot<M>,
    getReplayableState: () => ({
      log: [...msgLog],
      snapshot: currentModel as Snapshot<M>,
    }),
    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    shutdown: () => {
      isShutdown = true;
      if (options.subscriptionRunner) {
        activeSubs.forEach((sub) => options.subscriptionRunner!.stop(sub.key));
        activeSubs = [];
      }
      subscribers.clear();
      queue.length = 0;
    },
    getMsgLog: () => msgLog,
  };
}
