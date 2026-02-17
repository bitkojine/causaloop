import { describe, it, expect } from "vitest";
import { initialModel, update, AppMsg } from "./src/app.js";
import {
  replay,
  MsgLogEntry,
  CoreEffect,
  WrappedEffect,
} from "@causaloop/core";
describe("Causaloop Integration", () => {
  it("Search: should ignore stale responses", () => {
    let state = update(initialModel, {
      kind: "search",
      msg: { kind: "search_changed", query: "A" },
    });
    expect(state.model.search.lastRequestId).toBe(1);
    expect(state.model.search.status).toBe("loading");
    state = update(state.model, {
      kind: "search",
      msg: { kind: "search_changed", query: "B" },
    });
    expect(state.model.search.lastRequestId).toBe(2);
    state = update(state.model, {
      kind: "search",
      msg: {
        kind: "search_succeeded",
        results: [{ title: "A_result" }],
        requestId: 1,
      },
    });
    expect(state.model.search.status).toBe("loading");
    expect(state.model.search.results).toEqual([]);
    state = update(state.model, {
      kind: "search",
      msg: {
        kind: "search_succeeded",
        results: [{ title: "B_result" }],
        requestId: 2,
      },
    });
    expect(state.model.search.status).toBe("success");
    expect(state.model.search.results).toEqual([{ title: "B_result" }]);
  });
  it("Cancellation: should handle load and cancel", () => {
    let state = update(initialModel, {
      kind: "load",
      msg: { kind: "load_requested" },
    });
    expect(state.model.load.status).toBe("loading");
    expect(
      state.effects.find((e) => {
        const effect = e as WrappedEffect<AppMsg>;
        return (
          effect.original?.kind === "fetch" &&
          effect.original?.abortKey === "bigload"
        );
      }),
    ).toBeDefined();
    state = update(state.model, {
      kind: "load",
      msg: { kind: "load_cancelled" },
    });
    expect(state.model.load.status).toBe("cancelled");
    expect(
      state.effects.find((e) => {
        const effect = e as WrappedEffect<AppMsg>;
        return (
          effect.original?.kind === "cancel" &&
          effect.original?.abortKey === "bigload"
        );
      }),
    ).toBeDefined();
  });
  it("Replay: should yield identical final model", () => {
    let state = initialModel;
    const log: MsgLogEntry[] = [];
    const push = (msg: AppMsg) => {
      log.push({ msg, ts: Date.now() });
      const { model } = update(state, msg);
      state = model;
    };
    push({ kind: "timer", msg: { kind: "timer_started" } });
    push({ kind: "timer", msg: { kind: "timer_ticked" } });
    push({ kind: "search", msg: { kind: "search_changed", query: "test" } });
    push({
      kind: "search",
      msg: { kind: "search_succeeded", results: [], requestId: 1 },
    });
    const finalState = state;
    const replayedSnapshot = replay({
      initialModel,
      update,
      log,
    });
    expect(JSON.stringify(replayedSnapshot)).toBe(JSON.stringify(finalState));
  });
});
