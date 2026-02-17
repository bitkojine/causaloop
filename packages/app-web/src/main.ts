import "./style.css";
import "./styles/a11y.css";
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

const throttle = (fn: (log: readonly MsgLogEntry[]) => void, wait: number) => {
  let inThrottle: boolean,
    lastFn: ReturnType<typeof setTimeout>,
    lastTime: number;
  return (log: readonly MsgLogEntry[]) => {
    if (!inThrottle) {
      fn(log);
      lastTime = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFn);
      lastFn = setTimeout(
        () => {
          if (Date.now() - lastTime >= wait) {
            fn(log);
            lastTime = Date.now();
          }
        },
        Math.max(wait - (Date.now() - lastTime), 0),
      );
    }
  };
};

const saveLogThrottled = throttle((log: readonly MsgLogEntry[]) => {
  if (log.length > 0) {
    const recentLog = log.slice(-1000);
    localStorage.setItem("causaloop_log_v1", JSON.stringify(recentLog));
  }
}, 1000);

const appRoot = document.getElementById("app")!;
const runner = new BrowserRunner();
export const onReplay = (log: MsgLogEntry[], model: Snapshot<AppModel>) => {
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
const savedLogStr = localStorage.getItem("causaloop_log_v1");
if (savedLogStr) {
  try {
    const log = JSON.parse(savedLogStr);
    console.info(`[STORAGE] Found saved session with ${log.length} messages.`);
  } catch (e) {
    console.error("[STORAGE] Failed to parse saved log", e);
  }
}
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
const dispatcher = createDispatcher<
  AppModel,
  AppMsg,
  Effect | WrappedEffect<AppMsg>
>({
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
    const log = dispatcher.getMsgLog();
    saveLogThrottled(log);
  },
  devMode: true,
  assertInvariants: (model) => {
    if (typeof model.search.lastRequestId !== "number")
      throw new Error("Invariant failed");
  },
});
renderer.render(dispatcher.getSnapshot(), (msg: unknown) =>
  dispatcher.dispatch(msg as AppMsg),
);
