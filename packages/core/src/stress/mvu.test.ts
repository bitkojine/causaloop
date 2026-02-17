import { describe, it, expect } from "vitest";
import { createDispatcher } from "../dispatcher.js";
import { UpdateResult } from "../types.js";
type TestModel = {
  count: number;
  log: string[];
};
type TestMsg =
  | {
      kind: "INC";
    }
  | {
      kind: "DEC";
    }
  | {
      kind: "APPEND";
      value: string;
    }
  | {
      kind: "DISPATCH_SYNC";
      msg: TestMsg;
    }
  | {
      kind: "NO_OP";
    };
type TestEffect =
  | {
      kind: "NO_OP";
    }
  | {
      kind: "DISPATCH";
      msg: TestMsg;
    };
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
    const COUNT = 100000;
    for (let i = 0; i < COUNT; i++) {
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
    const BURST_SIZE = 10000;
    for (let i = 0; i < BURST_SIZE; i++) dispatcher.dispatch({ kind: "INC" });
    for (let i = 0; i < BURST_SIZE; i++) dispatcher.dispatch({ kind: "DEC" });
    expect(dispatcher.getSnapshot().count).toBe(0);
  });
  it("enforces FIFO ordering with synchronous re-entrancy (Effect-triggered dispatch)", () => {
    const dispatcher = createDispatcher<TestModel, TestMsg, TestEffect>({
      model: { count: 0, log: [] },
      update,
      effectRunner,
    });
    dispatcher.dispatch({
      kind: "DISPATCH_SYNC",
      msg: { kind: "APPEND", value: "B" },
    });
    dispatcher.dispatch({ kind: "APPEND", value: "C" });
    expect(dispatcher.getSnapshot().log).toEqual(["B", "C"]);
  });
  it("handles recursive re-entrancy limit (Stack safety)", () => {
    const recursiveUpdate = (
      model: TestModel,
      msg: TestMsg,
    ): UpdateResult<TestModel, TestEffect> => {
      if (msg.kind === "INC") {
        if (model.count < 50000) {
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
    expect(dispatcher.getSnapshot().count).toBe(50000);
  });
  it("detects impurity in update function (using immutable checks in devMode)", () => {
    const impureUpdate = (
      model: TestModel,
      msg: TestMsg,
    ): UpdateResult<TestModel, TestEffect> => {
      if (msg.kind === "INC") {
        model.count++;
        return { model, effects: [] };
      }
      return { model, effects: [] };
    };
    const dispatcher = createDispatcher<TestModel, TestMsg, TestEffect>({
      model: { count: 0, log: [] },
      update: impureUpdate,
      effectRunner,
      devMode: true,
    });
    expect(() => {
      dispatcher.dispatch({ kind: "INC" });
    }).toThrowError(/Cannot assign to read only property|not extensible/);
  });
});
