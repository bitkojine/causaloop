import { Effect, Msg } from "./types.js";

export interface MsgTemplate<T = unknown> {
  readonly kind: string;
  readonly payload?: T;
}

export interface FetchEffect<TMsg extends Msg = Msg> extends Effect {
  readonly kind: "fetch";
  readonly requestId: string;
  readonly purpose: string;
  readonly url: string;
  readonly method?: "GET" | "POST" | "PUT" | "DELETE";
  readonly headers?: Record<string, string>;
  readonly body?: string;
  readonly expect?: "json" | "text" | "arrayBuffer";
  readonly timeoutMs?: number;
  readonly abortKey?: string;
  readonly onSuccess: (data: unknown) => TMsg;
  readonly onError: (error: Error) => TMsg;
}

export interface TimerEffect<TMsg extends Msg = Msg> extends Effect {
  readonly kind: "timer";
  readonly timeoutMs: number;
  readonly onTimeout: () => TMsg;
}

export interface CancelEffect extends Effect {
  readonly kind: "cancel";
  readonly abortKey: string;
}

export interface AnimationFrameEffect<TMsg extends Msg = Msg> extends Effect {
  readonly kind: "animationFrame";
  readonly onFrame: (time: number) => TMsg;
}

export interface WorkerEffect<TMsg extends Msg = Msg> extends Effect {
  readonly kind: "worker";
  readonly taskId: string;
  readonly scriptUrl: string;
  readonly payload: unknown;
  readonly onSuccess: (data: unknown) => TMsg;
  readonly onError: (error: Error) => TMsg;
}

export interface WrappedEffect<TMsg extends Msg = Msg> extends Effect {
  readonly kind: "wrapper";
  readonly original: CoreEffect<Msg>;
  readonly wrap: (msg: unknown) => TMsg;
}

export type CoreEffect<TMsg extends Msg = Msg> =
  | FetchEffect<TMsg>
  | TimerEffect<TMsg>
  | CancelEffect
  | AnimationFrameEffect<TMsg>
  | WorkerEffect<TMsg>
  | WrappedEffect<TMsg>;
