import {
  Model,
  UpdateResult,
  FetchEffect,
  Snapshot,
  VNode,
  h,
} from "@causaloop/core";

export interface SearchModel extends Model {
  readonly query: string;
  readonly status: "idle" | "loading" | "success" | "error" | "stale";
  readonly results: unknown[];
  readonly lastRequestId: number;
}

export type SearchMsg =
  | { kind: "search_changed"; query: string }
  | { kind: "search_succeeded"; results: unknown; requestId: number }
  | { kind: "search_failed"; error: Error; requestId: number };

export const initialModel: SearchModel = {
  query: "",
  status: "idle",
  results: [],
  lastRequestId: 0,
};

export function update(
  model: SearchModel,
  msg: SearchMsg,
): UpdateResult<SearchModel> {
  switch (msg.kind) {
    case "search_changed": {
      const nextRequestId = model.lastRequestId + 1;
      const effect: FetchEffect<SearchMsg> = {
        kind: "fetch",
        requestId: String(nextRequestId),
        purpose: "Search query",
        url: `https://jsonplaceholder.typicode.com/posts?q=${encodeURIComponent(msg.query)}`,
        abortKey: "search",
        onSuccess: (data: unknown) => ({
          kind: "search_succeeded",
          results: data,
          requestId: nextRequestId,
        }),
        onError: (error: Error) => ({
          kind: "search_failed",
          error: error,
          requestId: nextRequestId,
        }),
      };
      return {
        model: {
          ...model,
          query: msg.query,
          status: "loading",
          lastRequestId: nextRequestId,
        },
        effects: [effect],
      };
    }
    case "search_succeeded":
      if (msg.requestId !== model.lastRequestId) {
        return { model, effects: [] }; // Ignore stale
      }
      return {
        model: {
          ...model,
          status: "success",
          results: msg.results as unknown[],
        },
        effects: [],
      };
    case "search_failed":
      if (msg.requestId !== model.lastRequestId) {
        return { model, effects: [] }; // Ignore stale
      }
      return {
        model: { ...model, status: "error" },
        effects: [],
      };
  }
}

export function view(
  snapshot: Snapshot<SearchModel>,
  dispatch: (msg: SearchMsg) => void,
): VNode {
  const resultsText =
    Array.isArray(snapshot.results) && snapshot.results.length > 0
      ? snapshot.results
          .map((r: unknown) => (r as { title: string }).title)
          .join("\n")
      : snapshot.status === "success"
        ? "No results found."
        : "";

  return h("div", { class: { "feature-container": true } }, [
    h("h3", {}, ["Feature A: Stale-Safe Search"]),
    h("input", {
      props: {
        type: "text",
        value: snapshot.query,
        placeholder: "Search posts...",
      },
      on: {
        input: (e: Event) =>
          dispatch({
            kind: "search_changed",
            query: (e.target as HTMLInputElement).value,
          }),
      },
    }),
    h("p", {}, [`Status: ${snapshot.status} (ID: ${snapshot.lastRequestId})`]),
    h("div", { class: { log: true } }, [resultsText]),
  ]);
}
