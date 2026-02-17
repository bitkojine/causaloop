import {
  Model,
  UpdateResult,
  Snapshot,
  MsgLogEntry,
  VNode,
  h,
} from "@causaloop/core";

export interface DevtoolsModel extends Model {
  readonly isOpen: boolean;
  readonly lastReplayResult: "success" | "failure" | null;
}

export type DevtoolsMsg =
  | { kind: "devtools_toggled" }
  | {
      kind: "replay_triggered";
      log: MsgLogEntry[];
      initialModel: Snapshot<Model>;
    }
  | { kind: "replay_completed"; success: boolean }
  | { kind: "log_imported"; log: MsgLogEntry[] };

export const initialModel: DevtoolsModel = {
  isOpen: false,
  lastReplayResult: null,
};

export function update(
  model: DevtoolsModel,
  msg: DevtoolsMsg,
): UpdateResult<DevtoolsModel> {
  switch (msg.kind) {
    case "devtools_toggled":
      return {
        model: { ...model, isOpen: !model.isOpen },
        effects: [],
      };
    case "replay_triggered":
      return { model, effects: [] };
    case "log_imported":
      // This is a "silent" update to the devtools state if needed,
      // but usually we want to trigger a replay or just store it.
      // For now, let's just make it available to the view.
      return { model, effects: [] };
    case "replay_completed":
      return {
        model: {
          ...model,
          lastReplayResult: msg.success ? "success" : "failure",
        },
        effects: [],
      };
  }
}

export function view<M extends Model>(
  snapshot: Snapshot<DevtoolsModel>,
  msgLog: readonly MsgLogEntry[],
  currentModel: Snapshot<M>,
  onReplay: (log: MsgLogEntry[], initialModel: Snapshot<M>) => void,
  dispatch: (msg: DevtoolsMsg) => void,
): VNode {
  if (!snapshot.isOpen) {
    return h("div", { class: { devtools: true } }, [
      h(
        "button",
        { on: { click: () => dispatch({ kind: "devtools_toggled" }) } },
        ["DevTools"],
      ),
    ]);
  }

  const logRows = msgLog
    .slice(-10)
    .map((e) => `[${new Date(e.ts).toLocaleTimeString()}] ${e.msg.kind}`)
    .join("\n");

  return h("div", { class: { devtools: true } }, [
    h("h3", {}, ["DevTools"]),
    h(
      "button",
      { on: { click: () => dispatch({ kind: "devtools_toggled" }) } },
      ["Close"],
    ),
    h("div", { class: { log: true } }, [logRows]),
    h("div", { class: { "btn-group": true } }, [
      h(
        "button",
        {
          class: { "export-btn": true },
          on: {
            click: () => {
              const data = JSON.stringify(msgLog);
              const blob = new Blob([data], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "causaloop-log.json";
              a.click();
            },
          },
        },
        ["Export Log"],
      ),
      h(
        "button",
        {
          class: { "import-btn": true },
          on: {
            click: () => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".json";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (re) => {
                    const content = re.target?.result as string;
                    try {
                      const log = JSON.parse(content);
                      onReplay(log, currentModel);
                    } catch (err) {
                      console.error("Failed to parse log", err);
                    }
                  };
                  reader.readAsText(file);
                }
              };
              input.click();
            },
          },
        },
        ["Import & Replay"],
      ),
      h(
        "button",
        {
          class: { "replay-btn": true },
          on: { click: () => onReplay([...msgLog], currentModel) },
        },
        ["Replay Log"],
      ),
      h(
        "button",
        {
          class: { "restore-btn": true },
          on: {
            click: () => {
              const saved = localStorage.getItem("causaloop_log_v1");
              if (saved) {
                try {
                  const log = JSON.parse(saved);
                  onReplay(log, currentModel);
                } catch (e) {
                  console.error("Failed to restore", e);
                }
              }
            },
          },
        },
        ["Restore Session"],
      ),
    ]),
    snapshot.lastReplayResult
      ? h("p", { class: { "replay-result": true } }, [
          `Replay result: ${snapshot.lastReplayResult}`,
        ])
      : text(""),
  ]);
}

function text(content: string): VNode {
  return { kind: "text", text: content };
}
