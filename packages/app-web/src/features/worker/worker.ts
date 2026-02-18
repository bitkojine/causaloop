import {
  Model,
  UpdateResult,
  Snapshot,
  WorkerEffect,
  VNode,
  h,
  UpdateContext,
} from "@causaloop/core";
import workerUrl from "./compute.worker?worker&url";
export interface WorkerModel extends Model {
  readonly result: number | null;
  readonly status: "idle" | "computing" | "done" | "error";
  readonly error: string | null;
  readonly lastTaskId: number;
}
export type WorkerMsg =
  | {
    kind: "compute_requested";
    n: number;
  }
  | {
    kind: "compute_succeeded";
    result: number;
    taskId: number;
  }
  | {
    kind: "compute_failed";
    error: Error;
    taskId: number;
  }
  | {
    kind: "compute_reset";
  };
export const initialModel: WorkerModel = {
  result: null,
  status: "idle",
  error: null,
  lastTaskId: 0,
};
export function update(
  model: WorkerModel,
  msg: WorkerMsg,
  _ctx: UpdateContext,
): UpdateResult<WorkerModel> {
  switch (msg.kind) {
    case "compute_requested": {
      const nextTaskId = model.lastTaskId + 1;
      const effect: WorkerEffect<WorkerMsg> = {
        kind: "worker",
        taskId: String(nextTaskId),
        scriptUrl: workerUrl,
        payload: msg.n,
        timeoutMs: 30000,
        onSuccess: (res: unknown) => ({
          kind: "compute_succeeded",
          result: res as number,
          taskId: nextTaskId,
        }),
        onError: (err) => ({
          kind: "compute_failed",
          error: err,
          taskId: nextTaskId,
        }),
      };
      return {
        model: {
          ...model,
          status: "computing",
          error: null,
          lastTaskId: nextTaskId,
        },
        effects: [effect],
      };
    }
    case "compute_succeeded":
      if (msg.taskId !== model.lastTaskId) return { model, effects: [] };
      return {
        model: { ...model, status: "done", result: msg.result, error: null },
        effects: [],
      };
    case "compute_failed":
      if (msg.taskId !== model.lastTaskId) return { model, effects: [] };
      return {
        model: { ...model, status: "error", error: msg.error.message },
        effects: [],
      };
    case "compute_reset":
      return {
        model: { ...initialModel, lastTaskId: model.lastTaskId },
        effects: [],
      };
  }
}
export function view(
  snapshot: Snapshot<WorkerModel>,
  dispatch: (msg: WorkerMsg) => void,
): VNode {
  const statusText =
    snapshot.status === "computing"
      ? "Worker status: computing… (30s timeout)"
      : `Worker status: ${snapshot.status}`;

  return h("div", { class: { "feature-container": true } }, [
    h("h3", {}, ["Feature E: Worker Compute"]),
    h("input", {
      props: {
        type: "number",
        value: "100000",
      },
      attrs: {
        "aria-label": "Number of primes to compute",
      },
    }),
    h("div", { class: { "btn-group": true } }, [
      h(
        "button",
        {
          props: {
            disabled: snapshot.status === "computing",
          },
          attrs: {
            "aria-label": "Start prime number computation",
          },
          on: {
            click: (e: Event) => {
              const input = (
                e.target as HTMLElement
              ).parentElement?.parentElement?.querySelector("input");
              if (input)
                dispatch({
                  kind: "compute_requested",
                  n: parseInt((input as HTMLInputElement).value),
                });
            },
          },
        },
        ["Compute Primes"],
      ),
      snapshot.status === "computing" || snapshot.status === "error"
        ? h(
          "button",
          {
            attrs: {
              "aria-label": "Reset worker to idle state",
            },
            on: {
              click: () => dispatch({ kind: "compute_reset" }),
            },
          },
          [snapshot.status === "computing" ? "Cancel" : "Reset"],
        )
        : h("span", {}, []),
    ]),
    h("p", {}, [
      statusText,
      snapshot.result !== null ? ` | Result: ${snapshot.result}` : "",
      snapshot.error ? ` | Error: ${snapshot.error}` : "",
    ]),
  ],
  );
}
