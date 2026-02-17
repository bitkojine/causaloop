import {
  createDispatcher,
  replay,
  MsgLogEntry,
  Snapshot,
  Effect,
  CoreEffect,
  WrappedEffect,
  Msg,
} from "@causaloop/core";
import {
  BrowserRunner,
  createSnabbdomRenderer,
} from "@causaloop/platform-browser";
import { initialModel, update, view, AppModel, AppMsg } from "./app.js";

const appRoot = document.getElementById("app")!;
const runner = new BrowserRunner();

const onReplay = (log: MsgLogEntry[], model: Snapshot<AppModel>) => {
  const finalSnapshot = replay({
    initialModel: model,
    update,
    log,
  });
  const isMatched =
    JSON.stringify(finalSnapshot) === JSON.stringify(dispatcher.getSnapshot());
  console.info("[REPLAY] Result:", isMatched ? "MATCH" : "MISMATCH");
  dispatcher.dispatch({
    kind: "devtools",
    msg: { kind: "replay_completed", success: isMatched },
  });
};

const renderer = createSnabbdomRenderer<AppModel>(
  appRoot,
  (snapshot: AppModel, dispatch: (msg: unknown) => void) =>
    view(
      snapshot,
      dispatcher.getMsgLog(),
      dispatch as (msg: AppMsg) => void,
      onReplay,
    ),
);

const dispatcher = createDispatcher<AppModel, AppMsg, Effect | WrappedEffect<AppMsg>>({
  model: initialModel,
  update,
  effectRunner: (effect, dispatch) => {
    if (
      effect &&
      typeof effect === "object" &&
      "kind" in effect &&
      effect.kind === "wrapper"
    ) {
      const wrapped = effect as WrappedEffect<AppMsg>;
      runner.run(wrapped.original, (msg: unknown) =>
        dispatch(wrapped.wrap(msg)),
      );
    } else {
      runner.run(effect as CoreEffect, dispatch as (msg: Msg) => void);
    }
  },
  onCommit: (snapshot: AppModel) => {
    renderer.render(snapshot, (msg: unknown) =>
      dispatcher.dispatch(msg as AppMsg),
    );
  },
  devMode: true,
  assertInvariants: (model) => {
    if (typeof model.search.lastRequestId !== "number")
      throw new Error("Invariant failed");
  },
});

// Initial render
renderer.render(dispatcher.getSnapshot(), (msg: unknown) =>
  dispatcher.dispatch(msg as AppMsg),
);
