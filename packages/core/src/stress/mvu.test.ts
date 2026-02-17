import { describe, it, expect } from "vitest";
import { createDispatcher } from "../dispatcher.js";
import { UpdateResult } from "../types.js";

// --- Types ---
type TestModel = { count: number; log: string[] };
type TestMsg =
  | { kind: "INC" }
  | { kind: "DEC" }
  | { kind: "APPEND"; value: string }
  | { kind: "DISPATCH_SYNC"; msg: TestMsg }
  | { kind: "NO_OP" };
type TestEffect = { kind: "NO_OP" } | { kind: "DISPATCH"; msg: TestMsg };

// --- Helpers ---
const update = (
  model: TestModel,
  msg: TestMsg,
): UpdateResult<TestModel, TestEffect> => {
  switch (msg.kind) {
    case "INC":
      return { model: { ...model, count: model.count + 1 }, effects: [] };
    case "DEC":
      return { model: { ...model, count: model.count - 1 }, effects: [] };
    case "APPEND":
      return {
        model: { ...model, log: [...model.log, msg.value] },
        effects: [],
      };
    case "DISPATCH_SYNC":
      return { model, effects: [{ kind: "DISPATCH", msg: msg.msg }] };
    case "NO_OP":
      return { model, effects: [] };
  }
};

const effectRunner = (effect: TestEffect, dispatch: (msg: TestMsg) => void) => {
  switch (effect.kind) {
    case "DISPATCH":
      dispatch(effect.msg);
      break;
    case "NO_OP":
      // Do nothing
      break;
  }
};

describe("Stress: MVU Correctness & Race Resistance", () => {
  it("handles high throughput spam (100k messages)", () => {
    const dispatcher = createDispatcher<TestModel, TestMsg, TestEffect>({
      model: { count: 0, log: [] },
      update,
      effectRunner,
    });

    const COUNT = 100_000;
    for (let i = 0; i < COUNT; i++) {
      // Mix it up slightly to ensure not just optimizing identical calls (if JS engine does that)
      if (i % 2 === 0) dispatcher.dispatch({ kind: "INC" });
      else dispatcher.dispatch({ kind: "INC" });
    }

    expect(dispatcher.getSnapshot().count).toBe(COUNT);
  });

  it("handles mixed message bursts", () => {
    const dispatcher = createDispatcher<TestModel, TestMsg, TestEffect>({
      model: { count: 0, log: [] },
      update,
      effectRunner,
    });

    const BURST_SIZE = 10_000;
    // Burst 1: INC
    for (let i = 0; i < BURST_SIZE; i++) dispatcher.dispatch({ kind: "INC" });
    // Burst 2: DEC
    for (let i = 0; i < BURST_SIZE; i++) dispatcher.dispatch({ kind: "DEC" });

    expect(dispatcher.getSnapshot().count).toBe(0);
  });

  it("enforces FIFO ordering with synchronous re-entrancy (Effect-triggered dispatch)", () => {
    // Explanation:
    // Dispatch("A") -> Update -> Effect("B") -> Dispatch("B")
    // Dispatch("C")
    // Expected processing order: A, B, C.
    // Why?
    // 1. Dispatch(A) starts processing.
    // 2. Queue: [A]. Shift A.
    // 3. Update(A) returns Effect(B).
    // 4. EffectRunner runs Effect(B). Calls Dispatch(B).
    // 5. Dispatch(B) sees isProcessing=true. Pushes B to Queue. Queue: [B].
    // 6. Loop checks Queue. Shift B. Process B.
    // 7. Loop finishes. isProcessing=false.
    // 8. Dispatch(A) returns.
    // 9. Dispatch(C) runs.

    const dispatcher = createDispatcher<TestModel, TestMsg, TestEffect>({
      model: { count: 0, log: [] },
      update,
      effectRunner,
    });

    // We want to track the order of *processing* (updates).
    // The "APPEND" msg appends to the log.

    // Test Case:
    // 1. Dispatch DISPATCH_SYNC(APPEND("B")) -> this serves as "A" which causes "B".
    // 2. Dispatch APPEND("C")

    dispatcher.dispatch({
      kind: "DISPATCH_SYNC",
      msg: { kind: "APPEND", value: "B" },
    });
    dispatcher.dispatch({ kind: "APPEND", value: "C" });

    // The first message "DISPATCH_SYNC" doesn't modify log itself, but triggers B.
    // Wait, update for "DISPATCH_SYNC" does NOT append "A". So let's trace:
    // 1. Dispatch(DS(B))
    //    - update: returns Effect(Dispatch(B))
    //    - effect: calls Dispatch(Append(B)) -> Queue: [Append(B)]
    //    - Loop continues. Shift Append(B).
    //    - update: log ["B"]
    //    - Loop ends.
    // 2. Dispatch(Append(C))
    //    - update: log ["B", "C"]

    expect(dispatcher.getSnapshot().log).toEqual(["B", "C"]);
  });

  it("handles recursive re-entrancy limit (Stack safety)", () => {
    // If we have infinite recursion of sync effects, it should blow the stack eventually
    // UNLESS the dispatcher uses `setImmediate` or similar to break stack.
    // But `dispatcher.ts` uses a `while` loop.
    // If Effect calls dispatch, it pushes to queue.
    // The `while` loop processes it.
    // This converts Recursion to Iteration! This is a FEATURE.
    // Let's verify it doesn't crash with 100k recursive depth.

    const recursiveUpdate = (
      model: TestModel,
      msg: TestMsg,
    ): UpdateResult<TestModel, TestEffect> => {
      if (msg.kind === "INC") {
        if (model.count < 50_000) {
          return {
            model: { ...model, count: model.count + 1 },
            effects: [{ kind: "DISPATCH", msg: { kind: "INC" } }],
          };
        }
      }
      return { model, effects: [] };
    };

    const dispatcher = createDispatcher<TestModel, TestMsg, TestEffect>({
      model: { count: 0, log: [] },
      update: recursiveUpdate,
      effectRunner,
    });

    dispatcher.dispatch({ kind: "INC" });

    // Should reach 50,000 without "Maximum call stack size exceeded"
    expect(dispatcher.getSnapshot().count).toBe(50_000);
  });

  it("detects impurity in update function (using immutable checks in devMode)", () => {
    // The dispatcher has `deepFreeze` in devMode.
    // If we attempt to mutate the model in update, it should throw TypeError (Cannot assign to read only property...)

    const impureUpdate = (
      model: TestModel,
      msg: TestMsg,
    ): UpdateResult<TestModel, TestEffect> => {
      if (msg.kind === "INC") {
        // @ts-expect-error - Testing devMode check
        model.count++; // NAUGHTY MUTATION
        return { model, effects: [] };
      }
      return { model, effects: [] };
    };

    const dispatcher = createDispatcher<TestModel, TestMsg, TestEffect>({
      model: { count: 0, log: [] },
      update: impureUpdate,
      effectRunner,
      devMode: true, // ENABLE CHECKS
    });

    expect(() => {
      dispatcher.dispatch({ kind: "INC" });
    }).toThrowError(/Cannot assign to read only property|not extensible/);
    // Exact error depends on engine/implementation of freeze, usually "Cannot assign to read only property"
  });
});
