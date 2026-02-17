import { Model, Msg, Effect, UpdateFn, MsgLogEntry, Snapshot } from './types.js';

export interface ReplayOptions<M extends Model, G extends Msg, E extends Effect> {
    readonly initialModel: M;
    readonly update: UpdateFn<M, G, E>;
    readonly log: readonly MsgLogEntry[];
}

export function replay<M extends Model, G extends Msg, E extends Effect>(
    options: ReplayOptions<M, G, E>
): Snapshot<M> {
    let model = options.initialModel;
    for (const entry of options.log) {
        const { model: nextModel } = options.update(model, entry.msg as G);
        model = nextModel;
    }
    return model as Snapshot<M>;
}
