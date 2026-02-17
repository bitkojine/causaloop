import { describe, it, expect } from "vitest";
import { createDispatcher } from "../dispatcher.js";
import { replay } from "../replay.js";
import { UpdateResult, MsgLogEntry } from "../types.js";
type State = {
  counter: number;
  history: string[];
  randoms: number[];
};
type Action =
  | {
      kind: "INC";
    }
  | {
      kind: "DEC";
    }
  | {
      kind: "ASYNC_INC";
    }
  | {
      kind: "ADD_RANDOM";
      val: number;
    };
type SideEffect =
  | {
      kind: "DELAYED_INC";
    }
  | {
      kind: "GENERATE_RANDOM";
    };
const update = (model: State, msg: Action): UpdateResult<State, SideEffect> => {
  switch (msg.kind) {
    case "INC":
      return {
        model: {
          ...model,
          counter: model.counter + 1,
          history: [...model.history, "INC"],
        },
        effects: [],
      };
    case "DEC":
      return {
        model: {
          ...model,
          counter: model.counter - 1,
          history: [...model.history, "DEC"],
        },
        effects: [],
      };
    case "ASYNC_INC":
      return {
        model,
        effects: [{ kind: "DELAYED_INC" }],
      };
    case "ADD_RANDOM":
      return {
        model: { ...model, randoms: [...model.randoms, msg.val] },
        effects: [],
      };
    default:
      return { model, effects: [] };
  }
};
const effectRunner = (effect: SideEffect, dispatch: (msg: Action) => void) => {
  switch (effect.kind) {
    case "DELAYED_INC":
      setTimeout(() => dispatch({ kind: "INC" }), 10);
      break;
    case "GENERATE_RANDOM":
      break;
  }
};
describe("Stress: Deterministic Replay", () => {
  it("Torture Test: Replays complex async session identically", async () => {
    const dispatcher = createDispatcher<State, Action, SideEffect>({
      model: { counter: 0, history: [], randoms: [] },
      update,
      effectRunner,
    });
    const ITERATIONS = 50;
    for (let i = 0; i < ITERATIONS; i++) {
      const rand = Math.random();
      if (rand < 0.3) {
        dispatcher.dispatch({ kind: "INC" });
      } else if (rand < 0.6) {
        dispatcher.dispatch({ kind: "ASYNC_INC" });
      } else {
        dispatcher.dispatch({ kind: "ADD_RANDOM", val: rand });
      }
      if (i % 10 === 0) await new Promise((r) => setTimeout(r, 5));
    }
    await new Promise((r) => setTimeout(r, 200));
    const finalSnapshot = dispatcher.getSnapshot();
    const log = dispatcher.getMsgLog();
    const replayedSnapshot = replay({
      initialModel: { counter: 0, history: [], randoms: [] },
      update,
      log,
    });
    expect(replayedSnapshot).toEqual(finalSnapshot);
  });
  it("Replay handles 10k log entries (Performance)", () => {
    const logs: MsgLogEntry[] = [];
    for (let i = 0; i < 10000; i++) {
      logs.push({ msg: { kind: "INC" }, ts: Date.now() });
    }
    const start = performance.now();
    const final = replay({
      initialModel: { counter: 0, history: [], randoms: [] },
      update,
      log: logs,
    });
    const end = performance.now();
    expect(final.counter).toBe(10000);
    expect(end - start).toBeLessThan(500);
  });
});
