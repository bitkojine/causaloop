import { Msg } from "./types.js";

export interface Subscription<TMsg extends Msg = Msg> {
  readonly kind: string;
  readonly key: string;
  readonly __msgType?: TMsg;
}

export interface TimerSubscription<
  TMsg extends Msg = Msg,
> extends Subscription<TMsg> {
  readonly kind: "timer";
  readonly intervalMs: number;
  readonly onTick: () => TMsg;
}

export interface AnimationFrameSubscription<
  TMsg extends Msg = Msg,
> extends Subscription<TMsg> {
  readonly kind: "animationFrame";
  readonly onFrame: (time: number) => TMsg;
}

export type CoreSubscription<TMsg extends Msg = Msg> =
  | TimerSubscription<TMsg>
  | AnimationFrameSubscription<TMsg>;

export interface SubscriptionDiff<TMsg extends Msg = Msg> {
  readonly toStart: readonly Subscription<TMsg>[];
  readonly toStop: readonly string[];
}

export function diffSubscriptions<TMsg extends Msg>(
  oldSubs: readonly Subscription<TMsg>[],
  newSubs: readonly Subscription<TMsg>[],
): SubscriptionDiff<TMsg> {
  const oldKeys = new Set(oldSubs.map((s) => s.key));
  const newKeys = new Set(newSubs.map((s) => s.key));

  const toStart = newSubs.filter((s) => !oldKeys.has(s.key));
  const toStop = oldSubs.filter((s) => !newKeys.has(s.key)).map((s) => s.key);

  return { toStart, toStop };
}
