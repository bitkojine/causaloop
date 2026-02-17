import { Model, UpdateResult, Effect } from "@causaloop/core";
import { h, VNode } from "@causaloop/core";
export interface StressModel extends Model {
  readonly status: "idle" | "running";
  readonly itemCount: number;
  readonly items: readonly {
    id: number;
    val: number;
  }[];
  readonly lastRenderTime: number;
  readonly scrollTop: number;
}
const ROW_HEIGHT = 30;
const VIEWPORT_HEIGHT = 300;
export const initialModel: StressModel = {
  status: "idle",
  itemCount: 10000,
  items: [],
  lastRenderTime: 0,
  scrollTop: 0,
};
export type StressMsg =
  | {
      kind: "start";
    }
  | {
      kind: "stop";
    }
  | {
      kind: "shuffle";
    }
  | {
      kind: "update_count";
      count: number;
    }
  | {
      kind: "scroll";
      scrollTop: number;
    };
export function update(
  model: StressModel,
  msg: StressMsg,
): UpdateResult<StressModel, Effect> {
  switch (msg.kind) {
    case "update_count":
      return { model: { ...model, itemCount: msg.count }, effects: [] };
    case "scroll":
      return { model: { ...model, scrollTop: msg.scrollTop }, effects: [] };
    case "start": {
      const items = Array.from({ length: model.itemCount }, (_, i) => ({
        id: i,
        val: i,
      }));
      return {
        model: { ...model, status: "running", items },
        effects: [
          {
            kind: "animationFrame",
            onFrame: () => ({ kind: "stress", msg: { kind: "shuffle" } }),
          } as Effect,
        ],
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
      for (let i = newItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = newItems[i]!;
        newItems[i] = newItems[j]!;
        newItems[j] = temp;
      }
      return {
        model: { ...model, items: newItems },
        effects: [
          {
            kind: "animationFrame",
            onFrame: () => ({ kind: "stress", msg: { kind: "shuffle" } }),
          } as Effect,
        ],
      };
    }
  }
}
export function view(
  model: StressModel,
  dispatch: (msg: StressMsg) => void,
): VNode {
  const nodes = h("div", { class: { "stress-container": true } }, [
    h("h3", {}, ["Feature F: VDOM Stress"]),
    h("div", { class: { controls: true } }, [
      h("label", {}, ["Count: "]),
      h(
        "input",
        {
          props: {
            type: "number",
            value: model.itemCount,
          },
          attrs: {
            "aria-label": "Number of items to render",
          },
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
          props: {
            disabled: model.status === "running",
          },
          attrs: {
            "aria-label": "Start VDOM stress test",
          },
        },
        ["Start Stress"],
      ),
      h(
        "button",
        {
          on: { click: () => dispatch({ kind: "stop" }) },
          props: {
            disabled: model.status === "idle",
          },
          attrs: {
            "aria-label": "Stop VDOM stress test",
          },
        },
        ["Stop Stress"],
      ),
    ]),
    h(
      "div",
      {
        style: {
          height: `${VIEWPORT_HEIGHT}px`,
          overflow: "auto",
          border: "1px solid #333",
          marginTop: "10px",
          position: "relative",
        },
        on: {
          scroll: (e: Event) =>
            dispatch({
              kind: "scroll",
              scrollTop: (e.target as HTMLElement).scrollTop,
            }),
        },
      },
      [
        h(
          "ul",
          {
            style: {
              height: `${model.items.length * ROW_HEIGHT}px`,
              position: "relative",
              margin: "0",
              padding: "0",
              listStyle: "none",
            },
          },
          (() => {
            const startIndex = Math.floor(model.scrollTop / ROW_HEIGHT);
            const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + 2;
            const endIndex = Math.min(
              model.items.length,
              startIndex + visibleCount,
            );
            const visibleItems = model.items.slice(startIndex, endIndex);

            return visibleItems.map((item, index) =>
              h(
                "li",
                {
                  key: item.id,
                  style: {
                    position: "absolute",
                    top: "0",
                    left: "0",
                    width: "100%",
                    height: `${ROW_HEIGHT}px`,
                    transform: `translateY(${(startIndex + index) * ROW_HEIGHT}px)`,
                    padding: "0 10px",
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    borderBottom: "1px solid #222",
                  },
                },
                [`Item ${item.id} - ${item.val}`],
              ),
            );
          })(),
        ),
      ],
    ),
  ]);
  return nodes;
}
