/**
 * Core types for the Causaloop MVU architecture.
 */

/**
 * The authoritative state of the application.
 * Must be JSON-serializable and immutable.
 */
export type Model = Record<string, unknown>;

/**
 * Messages are the only way to trigger state changes.
 */
export interface Msg {
  readonly kind: string;
}

/**
 * Side effects are expressed as data.
 */
export interface Effect {
  readonly kind: string;
}

/**
 * The result of an update function.
 */
export interface UpdateResult<M extends Model, E extends Effect = Effect> {
  readonly model: M;
  readonly effects: readonly E[];
}

/**
 * A derived, immutable snapshot of the model for the UI.
 */
export type Snapshot<M extends Model> = Readonly<M>;

/**
 * The pure update function.
 */
export type UpdateFn<M extends Model, G extends Msg, E extends Effect> = (
  model: M,
  msg: G,
) => UpdateResult<M, E>;

/**
 * Providers for deterministic execution.
 */
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
