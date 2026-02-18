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
export interface UpdateContext {
  random(): number;
  now(): number;
}
export interface Entropy {
  readonly random: readonly number[];
}
export type UpdateFn<M extends Model, G extends Msg, E extends Effect> = (
  model: M,
  msg: G,
  ctx: UpdateContext,
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
  readonly entropy?: Entropy;
}

export interface DeterminismResult {
  readonly isMatch: boolean;
  readonly divergenceIndex?: number;
  readonly originalSnapshot?: string;
  readonly replayedSnapshot?: string;
}

export interface PerformanceMetrics {
  readonly lastUpdateMs: number;
  readonly avgUpdateMs: number;
  readonly lastCommitMs: number;
  readonly avgCommitMs: number;
  readonly fps: number;
}
