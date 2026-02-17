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
  | { kind: "replay_completed"; success: boolean };

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
          class: { "replay-btn": true },
          on: { click: () => onReplay([...msgLog], currentModel) },
        },
        ["Replay Log"],
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
