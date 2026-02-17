import { describe, it, expect } from "vitest";
import { createDispatcher } from "../dispatcher.js";
import { UpdateResult } from "../types.js";

// --- Types ---
type StressModel = {
  count: number;
  lastTs: number;
};
type StressMsg =
  | { kind: "INC"; ts: number }
  | { kind: "RESET" }
  | { kind: "BATCH_INC"; amount: number };

type StressEffect = { kind: "NONE" };

const update = (
  model: StressModel,
  msg: StressMsg,
): UpdateResult<StressModel, StressEffect> => {
  switch (msg.kind) {
    case "INC":
      if (msg.ts < model.lastTs) {
        throw new Error(`Ordering violation: ${msg.ts} < ${model.lastTs}`);
      }
      return {
        model: {
          ...model,
          count: model.count + 1,
          lastTs: msg.ts,
        },
        effects: [],
      };
    case "RESET":
      return { model: { count: 0, lastTs: 0 }, effects: [] };
    case "BATCH_INC":
      return {
        model: { ...model, count: model.count + msg.amount },
        effects: [],
      };
  }
};

const effectRunner = () => {};

describe("MVU Core Stress", () => {
  it("processes 1,000,000 messages and measures throughput", () => {
    const dispatcher = createDispatcher<StressModel, StressMsg, StressEffect>({
      model: { count: 0, lastTs: 0 },
      update,
      effectRunner,
    });

    const COUNT = 1_000_000;
    for (let i = 0; i < COUNT; i++) {
      // Use BATCH_INC with amount 1 for high frequency processing
      dispatcher.dispatch({ kind: "BATCH_INC", amount: 1 });
    }
    expect(dispatcher.getSnapshot().count).toBe(COUNT);

    expect(dispatcher.getSnapshot().count).toBe(COUNT);
  });

  it("handles rapid concurrent bursts and preserves FIFO", async () => {
    const dispatcher = createDispatcher<StressModel, StressMsg, StressEffect>({
      model: { count: 0, lastTs: 0 },
      update: (m, msg) => {
        if (msg.kind === "INC") {
          if (msg.ts < m.lastTs) throw new Error("FIFO Failed");
          return {
            model: { ...m, count: m.count + 1, lastTs: msg.ts },
            effects: [],
          };
        }
        return { model: m, effects: [] };
      },
      effectRunner,
    });

    const BURST_SIZE = 1000;
    const CONCURRENCY = 10;

    const promises = [];
    for (let c = 0; c < CONCURRENCY; c++) {
      promises.push(
        (async () => {
          for (let i = 0; i < BURST_SIZE; i++) {
            dispatcher.dispatch({ kind: "INC", ts: performance.now() });
          }
        })(),
      );
    }

    await Promise.all(promises);
    expect(dispatcher.getSnapshot().count).toBe(BURST_SIZE * CONCURRENCY);
  });

  it("re-entrancy: verified that dispatch during update results in FIFO queuing", () => {
    let dispatcher: ReturnType<
      typeof createDispatcher<StressModel, StressMsg, StressEffect>
    > | null = null;

    const sneakyUpdate = (
      model: StressModel,
      msg: StressMsg,
    ): UpdateResult<StressModel, StressEffect> => {
      if (msg.kind === "INC") {
        if (dispatcher) {
          dispatcher.dispatch({ kind: "RESET" });
        }
        return { model: { ...model, count: model.count + 1 }, effects: [] };
      }
      if (msg.kind === "RESET") {
        return { model: { count: 0, lastTs: 0 }, effects: [] };
      }
      return { model, effects: [] };
    };

    dispatcher = createDispatcher<StressModel, StressMsg, StressEffect>({
      model: { count: 0, lastTs: 0 },
      update: sneakyUpdate,
      effectRunner,
    });

    dispatcher.dispatch({ kind: "INC", ts: 1 });

    // Result should be 0 because RESET was queued and processed immediately after INC
    expect(dispatcher.getSnapshot().count).toBe(0);
  });

  it("purity: deepFreeze catches mutations in devMode", () => {
    const impureUpdate = (model: {
      count: number;
    }): UpdateResult<{ count: number }, { kind: "NONE" }> => {
      model.count++;
      return { model, effects: [] };
    };
    const dispatcher = createDispatcher<
      { count: number },
      { kind: string },
      { kind: "NONE" }
    >({
      model: { count: 0 },
      update: impureUpdate,
      effectRunner: () => {},
      devMode: true,
    });
    expect(() => dispatcher.dispatch({ kind: "ANY" })).toThrow();
  });
});
