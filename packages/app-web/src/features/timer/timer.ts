import {
  Model,
  UpdateResult,
  Snapshot,
  TimerSubscription,
  Subscription,
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
        effects: [],
      };
    case "timer_ticked":
      if (!model.isRunning) return { model, effects: [] };
      return {
        model: { ...model, count: model.count + 1 },
        effects: [],
      };
    case "timer_stopped":
      return {
        model: { ...model, isRunning: false },
        effects: [],
      };
  }
}
export function subscriptions(
  model: Snapshot<TimerModel>,
): readonly Subscription<TimerMsg>[] {
  if (!model.isRunning) return [];
  return [
    {
      kind: "timer",
      key: "timer-tick",
      intervalMs: 1000,
      onTick: () => ({ kind: "timer_ticked" }),
    } as TimerSubscription<TimerMsg>,
  ];
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
          props: {
            disabled: snapshot.isRunning,
          },
          attrs: {
            "aria-label": "Start the timer",
          },
          on: { click: () => dispatch({ kind: "timer_started" }) },
        },
        ["Start Timer"],
      ),
      h(
        "button",
        {
          class: { "stop-btn": true },
          props: {
            disabled: !snapshot.isRunning,
          },
          attrs: {
            "aria-label": "Stop the timer",
          },
          on: { click: () => dispatch({ kind: "timer_stopped" }) },
        },
        ["Stop Timer"],
      ),
    ]),
  ]);
}
