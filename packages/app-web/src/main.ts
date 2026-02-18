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
import {
  initialModel,
  update,
  view,
  appSubscriptions,
  AppModel,
  AppMsg,
} from "./app.js";

const clearAllState = () => {
  localStorage.removeItem("causaloop_log_v1");
  const url = new URL(window.location.href);
  url.searchParams.delete("reset");
  window.location.replace(url.toString());
};

if (new URLSearchParams(window.location.search).has("reset")) {
  clearAllState();
}

const showRecoveryScreen = (reason: string) => {
  const app = document.getElementById("app");
  if (app) {
    app.innerHTML = "";
    const container = document.createElement("div");
    container.style.cssText =
      "display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80vh;padding:2rem;text-align:center;font-family:system-ui,sans-serif;";

    const icon = document.createElement("div");
    icon.textContent = "⚠️";
    icon.style.fontSize = "3rem";

    const title = document.createElement("h2");
    title.textContent = "Something went wrong";
    title.style.cssText = "margin:1rem 0 0.5rem;color:#1a1a2e;";

    const msg = document.createElement("p");
    msg.textContent = reason;
    msg.style.cssText =
      "color:#666;max-width:400px;line-height:1.5;margin-bottom:1.5rem;";

    const btn = document.createElement("button");
    btn.textContent = "Clear State & Reload";
    btn.style.cssText =
      "padding:12px 24px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;";
    btn.addEventListener("click", clearAllState);

    const hint = document.createElement("p");
    hint.style.cssText = "margin-top:1rem;color:#999;font-size:0.85rem;";
    hint.innerHTML =
      'Or add <code style="background:#f1f5f9;padding:2px 6px;border-radius:3px;">?reset</code> to the URL';

    container.append(icon, title, msg, btn, hint);
    app.appendChild(container);
  }
};

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
    localStorage.setItem("causaloop_log_v1", JSON.stringify(log));
  }
}, 1000);

const appRoot = document.getElementById("app")!;
const runner = new BrowserRunner();

const showToast = (
  message: string,
  type: "success" | "error" = "success",
  showReset = false,
) => {
  const toast = document.createElement("div");
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
  toast.style.display = "flex";
  toast.style.alignItems = "center";
  toast.style.gap = "12px";

  if (type === "success") {
    toast.style.backgroundColor = "#10b981";
  } else {
    toast.style.backgroundColor = "#ef4444";
  }

  const text = document.createElement("span");
  text.textContent = message;
  toast.appendChild(text);

  if (showReset) {
    const resetBtn = document.createElement("button");
    resetBtn.textContent = "Reset";
    resetBtn.style.cssText =
      "background:rgba(255,255,255,0.25);border:1px solid rgba(255,255,255,0.5);color:#fff;padding:4px 10px;border-radius:3px;cursor:pointer;font-size:0.85rem;";
    resetBtn.addEventListener("click", clearAllState);
    toast.appendChild(resetBtn);
  }

  document.body.appendChild(toast);

  setTimeout(
    () => {
      toast.style.opacity = "0";
      setTimeout(() => {
        if (toast.parentNode) document.body.removeChild(toast);
      }, 300);
    },
    showReset ? 8000 : 3000,
  );
};

try {
  let initialLog: readonly MsgLogEntry[] | undefined;
  let restoredModel: Snapshot<AppModel> | undefined;
  let restoreError: string | undefined;

  const savedLogStr = localStorage.getItem("causaloop_log_v1");

  if (savedLogStr) {
    try {
      const log = JSON.parse(savedLogStr);
      if (!Array.isArray(log)) throw new Error("Log is not an array");

      restoredModel = replay({
        initialModel,
        update,
        log,
      });

      if (restoredModel.worker.status === "computing") {
        restoredModel = {
          ...restoredModel,
          worker: {
            ...restoredModel.worker,
            status: "idle",
            error: null,
          },
        };
      }
      if (restoredModel.load.status === "loading") {
        restoredModel = {
          ...restoredModel,
          load: { ...restoredModel.load, status: "idle", data: null },
        };
      }
      if (restoredModel.search.status === "loading") {
        restoredModel = {
          ...restoredModel,
          search: { ...restoredModel.search, status: "idle" },
        };
      }

      initialLog = log;
    } catch (e) {
      restoreError = e instanceof Error ? e.message : String(e);
      localStorage.removeItem("causaloop_log_v1");
    }
  }

  const onReplay = (_log: MsgLogEntry[], model: Snapshot<AppModel>) => {
    const { log: atomicLog, snapshot: atomicSnapshot } =
      dispatcher.getReplayableState();
    const finalSnapshot = replay({
      initialModel: model,
      update,
      log: atomicLog,
    });
    const isMatched =
      JSON.stringify(finalSnapshot) === JSON.stringify(atomicSnapshot);

    const diffs: Array<{ key: string; expected: string; actual: string }> = [];
    if (!isMatched) {
      const replayedKeys = Object.keys(finalSnapshot);
      for (const key of replayedKeys) {
        const replayedVal = JSON.stringify(
          finalSnapshot[key as keyof AppModel],
        );
        const currentVal = JSON.stringify(
          atomicSnapshot[key as keyof AppModel],
        );
        if (replayedVal !== currentVal) {
          diffs.push({
            key,
            expected: replayedVal.slice(0, 120),
            actual: currentVal.slice(0, 120),
          });
        }
      }
    }

    dispatcher.dispatch({
      kind: "devtools",
      msg: {
        kind: "replay_completed",
        success: isMatched,
        diffs,
        logLength: atomicLog.length,
      },
    });
  };

  if (initialLog && restoredModel) {
    setTimeout(
      () => showToast("Session Restored Successfully", "success", true),
      100,
    );
  } else if (restoreError) {
    setTimeout(
      () => showToast(`Session Restore Failed: ${restoreError}`, "error", true),
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
    subscriptions: appSubscriptions,
    subscriptionRunner: {
      start: (sub, dispatch) =>
        runner.startSubscription(sub, dispatch as (msg: Msg) => void),
      stop: (key) => runner.stopSubscription(key),
    },
    assertInvariants: (model) => {
      if (typeof model.search.lastRequestId !== "number")
        throw new Error("Invariant failed");
    },
  });
  renderer.render(dispatcher.getSnapshot(), (msg: unknown) =>
    dispatcher.dispatch(msg as AppMsg),
  );
} catch (e) {
  showRecoveryScreen(
    e instanceof Error
      ? `Initialization error: ${e.message}. This is likely caused by corrupted saved state.`
      : "An unexpected error occurred during initialization.",
  );
}
