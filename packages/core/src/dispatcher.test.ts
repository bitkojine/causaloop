import { describe, it, expect, vi } from "vitest";
import { createDispatcher } from "./dispatcher.js";
import { Model, Effect, UpdateResult } from "./types.js";

describe("Dispatcher", () => {
  interface TestModel extends Model {
    count: number;
    history: string[];
  }

  type TestMsg = { kind: "increment" } | { kind: "nested" } | { kind: "error" };

  it("should process messages and update model", () => {
    const update = (
      model: TestModel,
      msg: TestMsg,
    ): UpdateResult<TestModel> => {
      switch (msg.kind) {
        case "increment":
          return { model: { ...model, count: model.count + 1 }, effects: [] };
        case "nested":
          return { model, effects: [] };
        case "error":
          return { model, effects: [] };
      }
    };

    const dispatcher = createDispatcher<TestModel, TestMsg, Effect>({
      model: { count: 0, history: [] },
      update,
      effectRunner: () => {},
    });

    dispatcher.dispatch({ kind: "increment" });
    expect(dispatcher.getSnapshot().count).toBe(1);
  });

  it("should handle nested dispatches via FIFO queue (no re-entrancy)", () => {
    const history: string[] = [];
    const update = (
      model: TestModel,
      msg: TestMsg,
    ): UpdateResult<TestModel> => {
      history.push(msg.kind);
      switch (msg.kind) {
        case "nested":
          // Attempting re-entrant dispatch
          dispatcher.dispatch({ kind: "increment" });
          return {
            model: { ...model, history: [...model.history, "nested"] },
            effects: [],
          };
        case "increment":
          return { model: { ...model, count: model.count + 1 }, effects: [] };
        case "error":
          return { model, effects: [] };
      }
    };

    const dispatcher = createDispatcher<TestModel, TestMsg, Effect>({
      model: { count: 0, history: [] },
      update,
      effectRunner: () => {},
    });

    dispatcher.dispatch({ kind: "nested" });

    // Expect 'nested' to finish before 'increment' starts processing next in queue
    // In our implementation, the loop continues until queue is empty.
    expect(history).toEqual(["nested", "increment"]);
    expect(dispatcher.getSnapshot().count).toBe(1);
    expect(dispatcher.getSnapshot().history).toEqual(["nested"]);
  });

  it("should deep-freeze model in dev mode", () => {
    const update = (
      model: TestModel,
      _msg: TestMsg,
    ): UpdateResult<TestModel> => {
      return { model, effects: [] };
    };

    const dispatcher = createDispatcher<TestModel, TestMsg, Effect>({
      model: { count: 0, history: [] },
      update,
      effectRunner: () => {},
      devMode: true,
    });

    const snapshot = dispatcher.getSnapshot() as Record<string, unknown>;
    expect(() => {
      snapshot.count = 10;
    }).toThrow();
  });

  it("should throttle notifications (batch updates)", async () => {
    const onCommit = vi.fn();
    const update = (model: TestModel): UpdateResult<TestModel> => ({
      model: { ...model, count: model.count + 1 },
      effects: [],
    });

    const dispatcher = createDispatcher<TestModel, TestMsg, Effect>({
      model: { count: 0, history: [] },
      update: update as any,
      effectRunner: () => {},
      onCommit,
    });

    // Dispatch 3 messages synchronously
    dispatcher.dispatch({ kind: "increment" } as any);
    dispatcher.dispatch({ kind: "increment" } as any);
    dispatcher.dispatch({ kind: "increment" } as any);

    // Synchronously, onCommit shouldn't have been called yet because it's deferred
    expect(onCommit).toHaveBeenCalledTimes(0);

    // Wait for microtask
    await Promise.resolve();

    // Should have been called exactly once for the batch
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(dispatcher.getSnapshot().count).toBe(3);
  });
});
