import { Model, Msg, UpdateResult, Effect, h, VNode } from "@causaloop/core";

export interface StressModel extends Model {
  readonly status: "idle" | "running";
  readonly itemCount: number;
  readonly items: readonly { id: number; val: number }[];
  readonly lastRenderTime: number;
}

export const initialModel: StressModel = {
  status: "idle",
  itemCount: 10000,
  items: [],
  lastRenderTime: 0,
};

export type StressMsg =
  | { kind: "start" }
  | { kind: "stop" }
  | { kind: "shuffle" }
  | { kind: "update_count"; count: number };

export interface StressEffect extends Effect {
  kind: "schedule_shuffle";
}

export function update(
  model: StressModel,
  msg: StressMsg,
): UpdateResult<StressModel, StressEffect> {
  switch (msg.kind) {
    case "update_count":
      return { model: { ...model, itemCount: msg.count }, effects: [] };
    case "start": {
      const items = Array.from({ length: model.itemCount }, (_, i) => ({
        id: i,
        val: i,
      }));
      return {
        model: { ...model, status: "running", items },
        effects: [{ kind: "schedule_shuffle" }],
      };
    }
    case "stop":
      return {
        model: { ...model, status: "idle", items: [] },
        effects: [],
      };
    case "shuffle": {
      if (model.status !== "running") return { model, effects: [] };

      const newItems = [...model.items];
      // Fisher-Yates shuffle mostly
      for (let i = newItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = newItems[i]!;
        newItems[i] = newItems[j]!;
        newItems[j] = temp;
      }

      return {
        model: { ...model, items: newItems },
        effects: [{ kind: "schedule_shuffle" }],
      };
    }
  }
}

export function view(
  model: StressModel,
  dispatch: (msg: StressMsg) => void,
): VNode {
  const start = performance.now();

  const nodes = h("div", { class: { "stress-container": true } }, [
    h("h3", {}, ["Feature F: VDOM Stress"]),
    h("div", { class: { controls: true } }, [
      h("label", {}, ["Count: "]),
      h(
        "input",
        {
          props: { type: "number", value: model.itemCount },
          on: {
            change: (e: Event) =>
              dispatch({
                kind: "update_count",
                count: parseInt((e.target as HTMLInputElement).value),
              }),
          },
        },
        [],
      ),
      h(
        "button",
        {
          on: { click: () => dispatch({ kind: "start" }) },
          props: { disabled: model.status === "running" },
        },
        ["Start Stress"],
      ),
      h(
        "button",
        {
          on: { click: () => dispatch({ kind: "stop" }) },
          props: { disabled: model.status === "idle" },
        },
        ["Stop Stress"],
      ),
    ]),
    h(
      "div",
      {
        style: {
          height: "300px",
          overflow: "auto",
          border: "1px solid #333",
          marginTop: "10px",
        },
      },
      [
        h(
          "ul",
          {},
          model.items.map((item) =>
            h("li", { key: item.id }, [`Item ${item.id} - ${item.val}`]),
          ),
        ),
      ],
    ),
  ]);

  const end = performance.now();
  // We can't easily update model in view (infinite loop), but we can log it
  if (model.status === "running" && Math.random() < 0.05) {
    console.log(
      `Stress View Generation: ${(end - start).toFixed(2)}ms for ${model.items.length} items`,
    );
  }

  return nodes;
}
