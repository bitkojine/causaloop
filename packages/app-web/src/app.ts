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

export interface AppModel extends Model {
  readonly search: Search.SearchModel;
  readonly load: Load.LoadModel;
  readonly timer: Timer.TimerModel;
  readonly animation: Animation.AnimationModel;
  readonly worker: WorkerFeature.WorkerModel;
  readonly devtools: Devtools.DevtoolsModel;
}

export type AppMsg =
  | { kind: "search"; msg: Search.SearchMsg }
  | { kind: "load"; msg: Load.LoadMsg }
  | { kind: "timer"; msg: Timer.TimerMsg }
  | { kind: "animation"; msg: Animation.AnimationMsg }
  | { kind: "worker"; msg: WorkerFeature.WorkerMsg }
  | { kind: "devtools"; msg: Devtools.DevtoolsMsg };

const initialModelTimer = Timer.initialModel;

export const initialModel: AppModel = {
  search: Search.initialModel,
  load: Load.initialModel,
  timer: initialModelTimer,
  animation: Animation.initialModel,
  worker: WorkerFeature.initialModel,
  devtools: Devtools.initialModel,
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
  }
}

export function view(
  snapshot: Snapshot<AppModel>,
  msgLog: readonly MsgLogEntry[],
  dispatch: (msg: AppMsg) => void,
  onReplay: (log: MsgLogEntry[], model: Snapshot<AppModel>) => void,
): VNode {
  const errorLogs = msgLog.filter(
    (entry) =>
      entry.msg.kind.endsWith("_failed") ||
      (entry.msg as any).kind === "compute_failed" ||
      (entry.msg as any).error,
  );

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
    h("div", { class: { "system-log": true } }, [
      h("h3", {}, ["System Log"]),
      errorLogs.length === 0
        ? h("p", { class: { "log-empty": true } }, ["No errors logged."])
        : h(
          "ul",
          {},
          errorLogs.slice(-5).map((entry) =>
            h("li", { class: { "log-error": true } }, [
              `${new Date().toLocaleTimeString()} - ${entry.msg.kind}: ${(entry.msg as any).error?.message || "Unknown error"
              }`,
            ]),
          ),
        ),
    ]),
  ]);
}
