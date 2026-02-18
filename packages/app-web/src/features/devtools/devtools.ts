import {
  Model,
  UpdateResult,
  Snapshot,
  MsgLogEntry,
  VNode,
  h,
  UpdateContext,
} from "@causaloop/core";

export interface ReplayDiff {
  readonly key: string;
  readonly expected: string;
  readonly actual: string;
}

export interface ReplayDetail {
  readonly success: boolean;
  readonly diffs: readonly ReplayDiff[];
  readonly logLength: number;
}

export interface DevtoolsModel extends Model {
  readonly isOpen: boolean;
  readonly lastReplayResult: ReplayDetail | null;
}
export type DevtoolsMsg =
  | {
    kind: "devtools_toggled";
  }
  | {
    kind: "replay_triggered";
    log: MsgLogEntry[];
    initialModel: Snapshot<Model>;
  }
  | {
    kind: "replay_completed";
    success: boolean;
    diffs: readonly ReplayDiff[];
    logLength: number;
  }
  | {
    kind: "log_imported";
    log: MsgLogEntry[];
  };
export const initialModel: DevtoolsModel = {
  isOpen: false,
  lastReplayResult: null,
};
export function update(
  model: DevtoolsModel,
  msg: DevtoolsMsg,
  _ctx: UpdateContext,
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
      return { model, effects: [] };
    case "replay_completed":
      return {
        model: {
          ...model,
          lastReplayResult: {
            success: msg.success,
            diffs: msg.diffs,
            logLength: msg.logLength,
          },
        },
        effects: [],
      };
  }
}

function renderReplayResult(detail: ReplayDetail): VNode {
  if (detail.success) {
    return h("div", { class: { "replay-result": true, success: true } }, [
      h("div", { class: { "replay-header": true } }, [
        h("span", { class: { "replay-badge": true } }, ["✓ Replay Passed"]),
      ]),
      h("p", { class: { "replay-explanation": true } }, [
        `Replayed ${detail.logLength} messages. The final state matches the current state exactly — your update function is deterministic.`,
      ]),
    ]);
  }

  return h("div", { class: { "replay-result": true, failure: true } }, [
    h("div", { class: { "replay-header": true } }, [
      h("span", { class: { "replay-badge": true } }, ["✗ Replay Mismatch"]),
    ]),
    h("p", { class: { "replay-explanation": true } }, [
      `Replayed ${detail.logLength} messages but the final state differs from the current state.`,
    ]),
    h("details", {}, [
      h("summary", {}, ["What does this mean?"]),
      h("p", {}, [
        "A deterministic update function should produce the same state when given the same messages. " +
        "A mismatch can occur when: (1) the update function uses non-deterministic values like Date.now() or Math.random() directly, " +
        "(2) effects modified external state that influenced subsequent updates, " +
        "or (3) the replay was run against a different starting model than the original session.",
      ]),
    ]),
    detail.diffs.length > 0
      ? h("div", { class: { "replay-diffs": true } }, [
        h("h4", {}, [`${detail.diffs.length} field(s) differ:`]),
        h(
          "table",
          {},
          [
            h("tr", {}, [
              h("th", {}, ["Field"]),
              h("th", {}, ["Replayed"]),
              h("th", {}, ["Current"]),
            ]),
          ].concat(
            detail.diffs.map((d) =>
              h("tr", {}, [
                h("td", {}, [d.key]),
                h("td", { class: { expected: true } }, [d.expected]),
                h("td", { class: { actual: true } }, [d.actual]),
              ]),
            ),
          ),
        ),
      ])
      : text(""),
  ]);
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
      ? renderReplayResult(snapshot.lastReplayResult)
      : text(""),
  ]);
}
function text(content: string): VNode {
  return { kind: "text", text: content };
}
