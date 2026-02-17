import {
  Model,
  UpdateResult,
  Snapshot,
  MsgLogEntry,
  VNode,
  h,
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
  | { kind: "search"; msg: Search.SearchMsg }
  | { kind: "load"; msg: Load.LoadMsg }
  | { kind: "timer"; msg: Timer.TimerMsg }
  | { kind: "animation"; msg: Animation.AnimationMsg }
  | { kind: "worker"; msg: WorkerFeature.WorkerMsg }
  | { kind: "devtools"; msg: Devtools.DevtoolsMsg }
  | { kind: "stress"; msg: Stress.StressMsg };

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
        effects: effects.flatMap((e) => {
          if (e.kind === "schedule_shuffle") {
            return [
              {
                kind: "animationFrame",
                onFrame: () => ({ kind: "stress", msg: { kind: "shuffle" } }),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any,
            ]; // Cast because TypeScript check might fail on exact Effect union in app.ts vs core
          }
          return [];
        }),
      };
    }
  }
}

export function view(
  snapshot: Snapshot<AppModel>,
  msgLog: readonly MsgLogEntry[],
  dispatch: (msg: AppMsg) => void,
  onReplay: (log: MsgLogEntry[], model: Snapshot<AppModel>) => void,
): VNode {
  const errorLogs = msgLog.filter((entry) => {
    const m = entry.msg;
    // Check if it's a wrapped message (AppMsg) with an error
    if ("msg" in m && typeof m.msg === "object" && m.msg !== null) {
      const inner = m.msg as { kind?: string; error?: unknown };
      return (
        inner.kind?.endsWith("_failed") ||
        inner.kind === "compute_failed" ||
        !!inner.error
      );
    }
    // Fallback for top-level errors
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

              // Unwrap logic for display
              if ("msg" in m && typeof m.msg === "object" && m.msg !== null) {
                const inner = m.msg as { kind: string; error?: unknown };
                kind = `${m.kind}/${inner.kind}`;
                if (inner.error) error = inner.error;
              } else if ("error" in m) {
                error = (m as { error: unknown }).error;
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
