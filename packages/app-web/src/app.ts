import {
  Model,
  UpdateResult,
  Snapshot,
  MsgLogEntry,
  VNode,
  h,
  Subscription,
  TimerSubscription,
  AnimationFrameSubscription,
} from "@causaloop/core";
import * as Search from "./features/search/search.js";
import * as Load from "./features/load/load.js";
import * as Timer from "./features/timer/timer.js";
import * as Animation from "./features/animation/animation.js";
import * as WorkerFeature from "./features/worker/worker.js";
import * as Devtools from "./features/devtools/devtools.js";
import * as Stress from "./features/stress/stress.js";
export interface AppModel extends Model {
  readonly search: Search.SearchModel;
  readonly load: Load.LoadModel;
  readonly timer: Timer.TimerModel;
  readonly animation: Animation.AnimationModel;
  readonly worker: WorkerFeature.WorkerModel;
  readonly devtools: Devtools.DevtoolsModel;
  readonly stress: Stress.StressModel;
}
export type AppMsg =
  | {
      kind: "search";
      msg: Search.SearchMsg;
    }
  | {
      kind: "load";
      msg: Load.LoadMsg;
    }
  | {
      kind: "timer";
      msg: Timer.TimerMsg;
    }
  | {
      kind: "animation";
      msg: Animation.AnimationMsg;
    }
  | {
      kind: "worker";
      msg: WorkerFeature.WorkerMsg;
    }
  | {
      kind: "devtools";
      msg: Devtools.DevtoolsMsg;
    }
  | {
      kind: "stress";
      msg: Stress.StressMsg;
    };
const initialModelTimer = Timer.initialModel;
export const initialModel: AppModel = {
  search: Search.initialModel,
  load: Load.initialModel,
  timer: initialModelTimer,
  animation: Animation.initialModel,
  worker: WorkerFeature.initialModel,
  devtools: Devtools.initialModel,
  stress: Stress.initialModel,
};
export function update(model: AppModel, msg: AppMsg): UpdateResult<AppModel> {
  switch (msg.kind) {
    case "search": {
      const { model: searchModel, effects } = Search.update(
        model.search,
        msg.msg,
      );
      return {
        model: { ...model, search: searchModel },
        effects: effects.map((e) => ({
          kind: "wrapper",
          original: e,
          wrap: (m: Search.SearchMsg): AppMsg => ({ kind: "search", msg: m }),
        })),
      };
    }
    case "load": {
      const { model: loadModel, effects } = Load.update(model.load, msg.msg);
      return {
        model: { ...model, load: loadModel },
        effects: effects.map((e) => ({
          kind: "wrapper",
          original: e,
          wrap: (m: Load.LoadMsg): AppMsg => ({ kind: "load", msg: m }),
        })),
      };
    }
    case "timer": {
      const { model: timerModel, effects } = Timer.update(model.timer, msg.msg);
      return {
        model: { ...model, timer: timerModel },
        effects: effects.map((e) => ({
          kind: "wrapper",
          original: e,
          wrap: (m: Timer.TimerMsg): AppMsg => ({ kind: "timer", msg: m }),
        })),
      };
    }
    case "animation": {
      const { model: animModel, effects } = Animation.update(
        model.animation,
        msg.msg,
      );
      return {
        model: { ...model, animation: animModel },
        effects: effects.map((e) => ({
          kind: "wrapper",
          original: e,
          wrap: (m: Animation.AnimationMsg): AppMsg => ({
            kind: "animation",
            msg: m,
          }),
        })),
      };
    }
    case "worker": {
      const { model: workerModel, effects } = WorkerFeature.update(
        model.worker,
        msg.msg,
      );
      return {
        model: { ...model, worker: workerModel },
        effects: effects.map((e) => ({
          kind: "wrapper",
          original: e,
          wrap: (m: WorkerFeature.WorkerMsg): AppMsg => ({
            kind: "worker",
            msg: m,
          }),
        })),
      };
    }
    case "devtools": {
      const { model: devtoolsModel, effects } = Devtools.update(
        model.devtools,
        msg.msg,
      );
      return {
        model: { ...model, devtools: devtoolsModel },
        effects: effects.map((e) => ({
          kind: "wrapper",
          original: e,
          wrap: (m: Devtools.DevtoolsMsg): AppMsg => ({
            kind: "devtools",
            msg: m,
          }),
        })),
      };
    }
    case "stress": {
      const { model: stressModel, effects } = Stress.update(
        model.stress,
        msg.msg,
      );
      return {
        model: { ...model, stress: stressModel },
        effects: effects.map((e) => ({
          kind: "wrapper" as const,
          original: e,
          wrap: (m: Stress.StressMsg): AppMsg => ({ kind: "stress", msg: m }),
        })),
      };
    }
  }
}
export function appSubscriptions(
  model: Snapshot<AppModel>,
): readonly Subscription<AppMsg>[] {
  const timerSubs: Subscription<AppMsg>[] = Timer.subscriptions(
    model.timer,
  ).map((sub) => {
    const timerSub = sub as TimerSubscription<Timer.TimerMsg>;
    const wrapped: TimerSubscription<AppMsg> = {
      kind: "timer",
      key: `timer:${sub.key}`,
      intervalMs: timerSub.intervalMs,
      onTick: () => ({ kind: "timer", msg: timerSub.onTick() }),
    };
    return wrapped;
  });
  const animSubs: Subscription<AppMsg>[] = Animation.subscriptions(
    model.animation,
  ).map((sub) => {
    const animSub = sub as AnimationFrameSubscription<Animation.AnimationMsg>;
    const wrapped: AnimationFrameSubscription<AppMsg> = {
      kind: "animationFrame",
      key: `animation:${sub.key}`,
      onFrame: (t: number) => ({ kind: "animation", msg: animSub.onFrame(t) }),
    };
    return wrapped;
  });
  const stressSubs: Subscription<AppMsg>[] = Stress.subscriptions(
    model.stress,
  ).map((sub) => {
    const stressSub = sub as AnimationFrameSubscription<Stress.StressMsg>;
    const wrapped: AnimationFrameSubscription<AppMsg> = {
      kind: "animationFrame",
      key: `stress:${sub.key}`,
      onFrame: (t: number) => ({ kind: "stress", msg: stressSub.onFrame(t) }),
    };
    return wrapped;
  });
  return [...timerSubs, ...animSubs, ...stressSubs];
}
export function view(
  snapshot: Snapshot<AppModel>,
  msgLog: readonly MsgLogEntry[],
  dispatch: (msg: AppMsg) => void,
  onReplay: (log: MsgLogEntry[], model: Snapshot<AppModel>) => void,
): VNode {
  const errorLogs = msgLog.filter((entry) => {
    const m = entry.msg;
    if ("msg" in m && typeof m.msg === "object" && m.msg !== null) {
      const inner = m.msg as {
        kind?: string;
        error?: unknown;
      };
      return (
        inner.kind?.endsWith("_failed") ||
        inner.kind === "compute_failed" ||
        !!inner.error
      );
    }
    return m.kind.endsWith("_failed") || ("error" in m && !!m.error);
  });
  return h("div", {}, [
    Search.view(snapshot.search, (m) => dispatch({ kind: "search", msg: m })),
    Load.view(snapshot.load, (m) => dispatch({ kind: "load", msg: m })),
    Timer.view(snapshot.timer, (m) => dispatch({ kind: "timer", msg: m })),
    Animation.view(snapshot.animation, (m) =>
      dispatch({ kind: "animation", msg: m }),
    ),
    WorkerFeature.view(snapshot.worker, (m) =>
      dispatch({ kind: "worker", msg: m }),
    ),
    Devtools.view(snapshot.devtools, msgLog, initialModel, onReplay, (m) =>
      dispatch({ kind: "devtools", msg: m }),
    ),
    Stress.view(snapshot.stress, (m) => dispatch({ kind: "stress", msg: m })),
    h("div", { class: { "system-log": true } }, [
      h("h3", {}, ["System Log"]),
      errorLogs.length === 0
        ? h("p", { class: { "log-empty": true } }, ["No errors logged."])
        : h(
            "ul",
            {},
            errorLogs.slice(-5).map((entry) => {
              const m = entry.msg;
              let kind = m.kind;
              let error: unknown = "Unknown error";
              if ("msg" in m && typeof m.msg === "object" && m.msg !== null) {
                const inner = m.msg as {
                  kind: string;
                  error?: unknown;
                };
                kind = `${m.kind}/${inner.kind}`;
                if (inner.error) error = inner.error;
              } else if ("error" in m) {
                error = (
                  m as {
                    error: unknown;
                  }
                ).error;
              }
              const errorMessage =
                error instanceof Error
                  ? error.message
                  : typeof error === "string"
                    ? error
                    : JSON.stringify(error);
              return h("li", { class: { "log-error": true } }, [
                `${new Date(entry.ts).toLocaleTimeString()} - ${kind}: ${errorMessage}`,
              ]);
            }),
          ),
    ]),
  ]);
}
