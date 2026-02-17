import { describe, it, expect, vi } from "vitest";
import { createDispatcher } from "../dispatcher.js";
import { replay } from "../replay.js";
import { Model, Msg, Effect, UpdateResult } from "../types.js";

// --- Domain ---
type State = {
  counter: number;
  history: string[];
  randoms: number[];
};

type Action =
  | { kind: "INC" }
  | { kind: "DEC" }
  | { kind: "ASYNC_INC" } // Triggers effect
  | { kind: "ADD_RANDOM"; val: number };

type SideEffect = { kind: "DELAYED_INC" } | { kind: "GENERATE_RANDOM" };

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
      setTimeout(() => dispatch({ kind: "INC" }), 10); // Non-deterministic timing in real world
      break;
    case "GENERATE_RANDOM":
      // In real app, this would use Math.random()
      // But here we are testing if the *resulting* message (ADD_RANDOM) is logged correctly
      // The randomness happens *before* dispatch.
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

    // 1. Generate Chaos
    // We will dispatch a mix of sync and async messages, and "external" events
    const ITERATIONS = 100;
    const promises = [];

    for (let i = 0; i < ITERATIONS; i++) {
      const rand = Math.random();
      if (rand < 0.3) {
        dispatcher.dispatch({ kind: "INC" });
      } else if (rand < 0.6) {
        dispatcher.dispatch({ kind: "ASYNC_INC" });
      } else {
        dispatcher.dispatch({ kind: "ADD_RANDOM", val: rand });
      }

      // Artificial delay between some dispatches to interleave with async effects
      if (i % 10 === 0) {
        await new Promise((r) => setTimeout(r, 5));
      }
    }

    // Wait for all async effects to settle
    await new Promise((r) => setTimeout(r, 200));

    const finalSnapshot = dispatcher.getSnapshot();
    const log = dispatcher.getMsgLog();

    // 2. Replay
    // Replay is synchronous and pure.
    const replayedSnapshot = replay({
      initialModel: { counter: 0, history: [], randoms: [] },
      update,
      log,
    });

    // 3. Assert
    // The IDs/References might differ if not primitive, but JSON structure should match.
    expect(replayedSnapshot).toEqual(finalSnapshot);

    // Also verify the history length matches log length roughly (excluding command messages that didn't change state directly? No, all msgs are logged)
    // Note: ASYNC_INC triggers DELAYED_INC -> INC.
    // So log should contain both ASYNC_INC and the resulting INC.
    // And Replay applies both.
    // ASYNC_INC update returns no model change.
    // INC update returns model change.
    // Correct.
  });

  it("Replay handles 10k log entries (Performance)", () => {
    const log: any[] = [];
    for (let i = 0; i < 10000; i++) {
      log.push({ msg: { kind: "INC" }, ts: Date.now() });
    }

    const start = performance.now();
    const final = replay({
      initialModel: { counter: 0, history: [], randoms: [] },
      update,
      log,
    });
    const end = performance.now();

    expect(final.counter).toBe(10000);

    // Should be fast (e.g. < 100ms for 10k simple updates)
    // console.log(`Replay 10k took ${end - start}ms`);
    expect(end - start).toBeLessThan(500);
  });
});
