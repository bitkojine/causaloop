import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { BrowserRunner } from "../runners/index.js";
import {
  FetchEffect,
  TimerEffect,
  AnimationFrameEffect,
  CancelEffect,
} from "@causaloop/core";

const mockDispatch = vi.fn();

// Polyfill RAF if missing (JSDOM might not have it or it might be flaky)
if (typeof window !== "undefined" && !window.requestAnimationFrame) {
  window.requestAnimationFrame = (callback: FrameRequestCallback) => {
    return setTimeout(() => callback(Date.now()), 16) as unknown as number;
  };
}

describe("Effects Extreme Stress", () => {
  let runner: BrowserRunner;
  let mockFetch: Mock;
  let createdControllers: AbortController[];

  beforeEach(() => {
    mockFetch = vi.fn();
    createdControllers = [];
    runner = new BrowserRunner({
      fetch: mockFetch,
      createAbortController: () => {
        const controller = new AbortController();
        vi.spyOn(controller, "abort");
        createdControllers.push(controller);
        return controller;
      },
    });
    mockDispatch.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Timer Storm: handles 10,000 concurrent timers", () => {
    const COUNT = 10_000;
    for (let i = 0; i < COUNT; i++) {
      runner.run(
        {
          kind: "timer",
          timeoutMs: 0,
          onTimeout: () => ({ kind: "TIMER_DONE", id: i }),
        } as TimerEffect,
        mockDispatch,
      );
    }

    vi.runAllTimers();
    expect(mockDispatch).toHaveBeenCalledTimes(COUNT);
  });

  it("Fetch/Cancel Race: rapidly schedules and cancels requests", async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Hang forever

    const COUNT = 100;
    for (let i = 0; i < COUNT; i++) {
      const abortKey = `key-${i % 10}`;
      runner.run(
        {
          kind: "fetch",
          requestId: `req-${i}`,
          purpose: "stress",
          url: `/api/${i}`,
          abortKey,
          onSuccess: () => ({ kind: "OK" }),
          onError: () => ({ kind: "ERR" }),
        } as FetchEffect,
        mockDispatch,
      );

      if (i % 2 === 0) {
        runner.run(
          {
            kind: "cancel",
            abortKey,
          } as CancelEffect,
          mockDispatch,
        );
      }
    }

    expect(createdControllers.length).toBe(COUNT);
    const aborted = createdControllers.filter((c) => c.signal.aborted).length;
    expect(aborted).toBeGreaterThan(0);
  });

  it("RAF: processes backlog of animation frames", async () => {
    const COUNT = 100;
    for (let i = 0; i < COUNT; i++) {
      runner.run(
        {
          kind: "animationFrame",
          onFrame: (t) => ({ kind: "FRAME", t }),
        } as AnimationFrameEffect,
        mockDispatch,
      );
    }

    vi.runAllTimers();
    expect(mockDispatch).toHaveBeenCalledTimes(COUNT);
  });
});
