import {
  Model,
  UpdateResult,
  Snapshot,
  AnimationFrameEffect,
  VNode,
  h,
} from "@causaloop/core";

export interface AnimationModel extends Model {
  readonly angle: number;
  readonly isRunning: boolean;
}

export type AnimationMsg =
  | { kind: "animation_started" }
  | { kind: "animation_frame"; time: number }
  | { kind: "animation_stopped" };

export const initialModel: AnimationModel = {
  angle: 0,
  isRunning: false,
};

export function update(
  model: AnimationModel,
  msg: AnimationMsg,
): UpdateResult<AnimationModel> {
  switch (msg.kind) {
    case "animation_started":
      if (model.isRunning) return { model, effects: [] };
      return {
        model: { ...model, isRunning: true },
        effects: [
          {
            kind: "animationFrame",
            onFrame: (t: number) => ({ kind: "animation_frame", time: t }),
          } as AnimationFrameEffect<AnimationMsg>,
        ],
      };
    case "animation_frame":
      if (!model.isRunning) return { model, effects: [] };
      return {
        model: { ...model, angle: model.angle + 0.1 },
        effects: [
          {
            kind: "animationFrame",
            onFrame: (t: number) => ({ kind: "animation_frame", time: t }),
          } as AnimationFrameEffect<AnimationMsg>,
        ],
      };
    case "animation_stopped":
      return {
        model: { ...model, isRunning: false },
        effects: [],
      };
  }
}

export function view(
  snapshot: Snapshot<AnimationModel>,
  dispatch: (msg: AnimationMsg) => void,
): VNode {
  return h("div", { class: { "feature-container": true } }, [
    h("h3", {}, ["Feature D: Animation"]),
    h("div", {
      class: { "animation-box": true },
      style: {
        width: "50px",
        height: "50px",
        background: "#007aff",
        margin: "10px auto",
        transform: `rotate(${snapshot.angle}rad)`,
      },
    }),
    h("div", { class: { "btn-group": true } }, [
      h(
        "button",
        {
          class: { "start-btn": true },
          props: { disabled: snapshot.isRunning },
          on: { click: () => dispatch({ kind: "animation_started" }) },
        },
        ["Start Animation"],
      ),
      h(
        "button",
        {
          class: { "stop-btn": true },
          props: { disabled: !snapshot.isRunning },
          on: { click: () => dispatch({ kind: "animation_stopped" }) },
        },
        ["Stop Animation"],
      ),
    ]),
  ]);
}
