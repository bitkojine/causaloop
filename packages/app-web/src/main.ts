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
  const current = dispatcher.getSnapshot();
  const isMatched = JSON.stringify(finalSnapshot) === JSON.stringify(current);

  const diffs: Array<{ key: string; expected: string; actual: string }> = [];
  if (!isMatched) {
    const replayedKeys = Object.keys(finalSnapshot);
    for (const key of replayedKeys) {
      const replayedVal = JSON.stringify(finalSnapshot[key as keyof AppModel]);
      const currentVal = JSON.stringify(current[key as keyof AppModel]);
      if (replayedVal !== currentVal) {
        diffs.push({
          key,
          expected: replayedVal.slice(0, 120),
          actual: currentVal.slice(0, 120),
        });
      }
    }
  }

  console.info("[REPLAY] Result:", isMatched ? "MATCH" : "MISMATCH");
  dispatcher.dispatch({
    kind: "devtools",
    msg: {
      kind: "replay_completed",
      success: isMatched,
      diffs,
      logLength: log.length,
    },
  });
};
const savedLogStr = localStorage.getItem("causaloop_log_v1");
let initialLog: readonly MsgLogEntry[] | undefined;
let restoredModel: Snapshot<AppModel> | undefined;
let restoreError: string | undefined;

if (savedLogStr) {
  try {
    const log = JSON.parse(savedLogStr);
    if (!Array.isArray(log)) throw new Error("Log is not an array");
    console.info(`[STORAGE] Found saved session with ${log.length} messages.`);

    restoredModel = replay({
      initialModel,
      update,
      log,
    });
    initialLog = log;
    console.info("[STORAGE] Session restored successfully.");
  } catch (e) {
    console.error("[STORAGE] Failed to restore session:", e);
    restoreError = e instanceof Error ? e.message : String(e);

    localStorage.removeItem("causaloop_log_v1");
  }
}

const showToast = (message: string, type: "success" | "error" = "success") => {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.right = "20px";
  toast.style.padding = "10px 20px";
  toast.style.borderRadius = "4px";
  toast.style.color = "#fff";
  toast.style.fontWeight = "500";
  toast.style.zIndex = "1000";
  toast.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
  toast.style.transition = "opacity 0.3s ease";

  if (type === "success") {
    toast.style.backgroundColor = "#10b981";
  } else {
    toast.style.backgroundColor = "#ef4444";
  }

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
};

if (initialLog && restoredModel) {
  setTimeout(() => showToast("Session Restored Successfully"), 100);
} else if (restoreError) {
  setTimeout(
    () => showToast(`Session Restore Failed: ${restoreError}`, "error"),
    100,
  );
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
  model: restoredModel || initialModel,
  ...(initialLog ? { initialLog } : {}),
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
