import { describe, it, expect } from "vitest";
import { createDispatcher } from "../dispatcher.js";
import { replay } from "../replay.js";
import { UpdateResult, MsgLogEntry, Model, Msg, Effect } from "../types.js";

// --- Types ---
interface ChaosModel extends Model {
  count: number;
  data: string[];
}
type ChaosMsg = { kind: "TICK" } | { kind: "DATA_RECV"; payload: string };

const chaosUpdate = (
  model: ChaosModel,
  msg: ChaosMsg,
): UpdateResult<ChaosModel, Effect> => {
  switch (msg.kind) {
    case "TICK":
      return { model: { ...model, count: model.count + 1 }, effects: [] };
    case "DATA_RECV":
      return {
        model: { ...model, data: [...model.data, msg.payload] },
        effects: [],
      };
  }
};

describe("Replay Reliability Torture", () => {
  it("Replays a long log (100k entries) for final state consistency", () => {
    const LOG_SIZE = 100_000;
    const log: MsgLogEntry[] = [];
    const initialModel: ChaosModel = { count: 0, data: [] };

    for (let i = 0; i < LOG_SIZE; i++) {
      if (i % 2 === 0) {
        log.push({ msg: { kind: "TICK" } as Msg, ts: i });
      } else {
        log.push({
          msg: { kind: "DATA_RECV", payload: `item-${i}` } as Msg,
          ts: i,
        });
      }
    }

    const finalModel = replay({
      initialModel,
      update: chaosUpdate as unknown as (
        m: Model,
        msg: Msg,
      ) => UpdateResult<Model, Effect>,
      log,
    }) as ChaosModel;

    expect(finalModel.count).toBe(LOG_SIZE / 2);
    expect(finalModel.data.length).toBe(LOG_SIZE / 2);
    expect(finalModel.data[finalModel.data.length - 1]).toBe(
      `item-${LOG_SIZE - 1}`,
    );
  });

  it("Hunt Nondeterminism: verifying replay matches live session with mocks", async () => {
    // In this test we verify if the "live" dispatcher's final model
    // matches the replayed model when effects are mocked.

    const dispatcher = createDispatcher<ChaosModel, ChaosMsg, Effect>({
      model: { count: 0, data: [] },
      update: chaosUpdate,
      effectRunner: () => {},
    });

    dispatcher.dispatch({ kind: "TICK" });
    dispatcher.dispatch({ kind: "DATA_RECV", payload: "A" });
    dispatcher.dispatch({ kind: "TICK" });
    dispatcher.dispatch({ kind: "DATA_RECV", payload: "B" });

    const liveModel = dispatcher.getSnapshot();
    const log = dispatcher.getMsgLog();

    const replayedModel = replay({
      initialModel: { count: 0, data: [] },
      update: chaosUpdate as unknown as (
        m: Model,
        msg: Msg,
      ) => UpdateResult<Model, Effect>,
      log,
    });

    expect(replayedModel).toEqual(liveModel);
  });
});
