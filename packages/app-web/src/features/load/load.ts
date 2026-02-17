import {
  Model,
  UpdateResult,
  FetchEffect,
  Snapshot,
  CancelEffect,
  VNode,
  h,
} from "@causaloop/core";
export interface LoadModel extends Model {
  readonly status: "idle" | "loading" | "success" | "error" | "cancelled";
  readonly data: unknown | null;
}
export type LoadMsg =
  | {
      kind: "load_requested";
    }
  | {
      kind: "load_succeeded";
      data: unknown;
    }
  | {
      kind: "load_failed";
      error: Error;
    }
  | {
      kind: "load_cancelled";
    };
export const initialModel: LoadModel = {
  status: "idle",
  data: null,
};
export function update(
  model: LoadModel,
  msg: LoadMsg,
): UpdateResult<LoadModel> {
  switch (msg.kind) {
    case "load_requested": {
      const effect: FetchEffect<LoadMsg> = {
        kind: "fetch",
        requestId: "bigload",
        purpose: "Load big data",
        url: "https://jsonplaceholder.typicode.com/photos",
        abortKey: "bigload",
        onSuccess: (data: unknown) => ({ kind: "load_succeeded", data }),
        onError: (error: Error) => ({ kind: "load_failed", error }),
      };
      return {
        model: { ...model, status: "loading", data: null },
        effects: [effect],
      };
    }
    case "load_succeeded":
      return {
        model: { ...model, status: "success", data: msg.data },
        effects: [],
      };
    case "load_failed":
      return {
        model: { ...model, status: "error" },
        effects: [],
      };
    case "load_cancelled":
      return {
        model: { ...model, status: "cancelled" },
        effects: [{ kind: "cancel", abortKey: "bigload" } as CancelEffect],
      };
  }
}
export function view(
  snapshot: Snapshot<LoadModel>,
  dispatch: (msg: LoadMsg) => void,
): VNode {
  return h("div", { class: { "feature-container": true } }, [
    h("h3", {}, ["Feature B: Cancellation"]),
    h("div", { class: { "btn-group": true } }, [
      h(
        "button",
        {
          props: {
            disabled: snapshot.status === "loading",
          },
          attrs: {
            "aria-label": "Load big data from API",
          },
          on: { click: () => dispatch({ kind: "load_requested" }) },
        },
        ["Load Big Data"],
      ),
      h(
        "button",
        {
          props: {
            disabled: snapshot.status !== "loading",
          },
          attrs: {
            "aria-label": "Cancel loading",
          },
          on: { click: () => dispatch({ kind: "load_cancelled" }) },
        },
        ["Cancel"],
      ),
    ]),
    h("p", {}, [`Load status: ${snapshot.status}`]),
  ]);
}
