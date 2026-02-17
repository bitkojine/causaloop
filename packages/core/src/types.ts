export type Model = Record<string, unknown>;
export interface Msg {
  readonly kind: string;
}
export interface Effect {
  readonly kind: string;
}
export interface UpdateResult<M extends Model, E extends Effect = Effect> {
  readonly model: M;
  readonly effects: readonly E[];
}
export type Snapshot<M extends Model> = Readonly<M>;
export type UpdateFn<M extends Model, G extends Msg, E extends Effect> = (
  model: M,
  msg: G,
) => UpdateResult<M, E>;
export interface TimeProvider {
  now(): number;
}
export interface RandomProvider {
  random(): number;
}
export interface MsgLogEntry {
  readonly msg: Msg;
  readonly ts: number;
}
