import {
  Model,
  UpdateResult,
  Snapshot,
  TimerEffect,
  VNode,
  h,
} from "@causaloop/core";
export interface TimerModel extends Model {
  readonly count: number;
  readonly isRunning: boolean;
}
export type TimerMsg =
  | {
      kind: "timer_started";
    }
  | {
      kind: "timer_ticked";
    }
  | {
      kind: "timer_stopped";
    };
export const initialModel: TimerModel = {
  count: 0,
  isRunning: false,
};
export function update(
  model: TimerModel,
  msg: TimerMsg,
): UpdateResult<TimerModel> {
  switch (msg.kind) {
    case "timer_started":
      if (model.isRunning) return { model, effects: [] };
      return {
        model: { ...model, isRunning: true },
        effects: [
          {
            kind: "timer",
            timeoutMs: 1000,
            onTimeout: () => ({ kind: "timer_ticked" }),
          } as TimerEffect<TimerMsg>,
        ],
      };
    case "timer_ticked":
      if (!model.isRunning) return { model, effects: [] };
      return {
        model: { ...model, count: model.count + 1 },
        effects: [
          {
            kind: "timer",
            timeoutMs: 1000,
            onTimeout: () => ({ kind: "timer_ticked" }),
          } as TimerEffect<TimerMsg>,
        ],
      };
    case "timer_stopped":
      return {
        model: { ...model, isRunning: false },
        effects: [],
      };
  }
}
export function view(
  snapshot: Snapshot<TimerModel>,
  dispatch: (msg: TimerMsg) => void,
): VNode {
  return h("div", { class: { "feature-container": true } }, [
    h("h3", {}, ["Feature C: Timer"]),
    h("p", {}, [`Count: ${snapshot.count} `]),
    h("div", { class: { "btn-group": true } }, [
      h(
        "button",
        {
          class: { "start-btn": true },
          props: { disabled: snapshot.isRunning },
          on: { click: () => dispatch({ kind: "timer_started" }) },
        },
        ["Start Timer"],
      ),
      h(
        "button",
        {
          class: { "stop-btn": true },
          props: { disabled: !snapshot.isRunning },
          on: { click: () => dispatch({ kind: "timer_stopped" }) },
        },
        ["Stop Timer"],
      ),
    ]),
  ]);
}
