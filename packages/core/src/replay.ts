import {
  Model,
  Msg,
  Effect,
  UpdateFn,
  MsgLogEntry,
  Snapshot,
  UpdateContext,
} from "./types.js";
export interface ReplayOptions<
  M extends Model,
  G extends Msg,
  E extends Effect,
> {
  readonly initialModel: M;
  readonly update: UpdateFn<M, G, E>;
  readonly log: readonly MsgLogEntry[];
}
export function replay<M extends Model, G extends Msg, E extends Effect>(
  options: ReplayOptions<M, G, E>,
): Snapshot<M> {
  let model = options.initialModel;
  for (const entry of options.log) {
    const entropy = entry.entropy?.random ? [...entry.entropy.random] : [];
    const ctx: UpdateContext = {
      random: () => {
        const r = entropy.shift();
        return r !== undefined ? r : Math.random();
      },
      now: () => entry.ts,
    };
    const { model: nextModel } = options.update(model, entry.msg as G, ctx);
    model = nextModel;
  }
  return model as Snapshot<M>;
}
