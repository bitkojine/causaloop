import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BrowserRunner } from "../runners/index.js";
import { FetchEffect, WorkerEffect, CancelEffect } from "@causaloop/core";

// Mock globals
const mockDispatch = vi.fn();
global.fetch = vi.fn();
// @ts-expect-error - Mocking global Worker
global.Worker = vi.fn(function (this: Worker) {
  this.onmessage = null;
  this.onerror = null;
  this.postMessage = vi.fn((data: unknown) => {
    // Simulate async processing
    setTimeout(() => {
      if (data === "CRASH") {
        if (this.onerror) {
          this.onerror(
            new ErrorEvent("error", {
              message: "CRASHED",
              filename: "worker.js",
              lineno: 1,
            }),
          );
        }
      } else if (data === "echo") {
        if (this.onmessage)
          this.onmessage(new MessageEvent("message", { data: "echo" }));
      }
    }, 10);
  });
  this.terminate = vi.fn();
});

describe("Stress: Effects as Data Integrity", () => {
  let runner: BrowserRunner;

  beforeEach(() => {
    runner = new BrowserRunner();
    mockDispatch.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Fetch: handles 500 errors gracefully", async () => {
    // @ts-expect-error - Mocking global fetch
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    runner.run(
      {
        kind: "fetch",
        url: "/api/crash",
        requestId: "req-crash",
        purpose: "stress",
        onError: (err: unknown) => ({ kind: "ERROR", err }),
        onSuccess: (data: unknown) => ({ kind: "SUCCESS", data }),
      } as FetchEffect,
      mockDispatch,
    );

    // Wait for promise
    await vi.waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "ERROR" }),
      );
    });
  });

  it("Fetch: handles abortKey overwrite (Leak detection)", async () => {
    // If we fire 2 fetches with same abortKey, and then cancel, does it work?
    // And do we leak controllers?

    const abortSpy = vi.spyOn(AbortController.prototype, "abort");
    // @ts-expect-error - Mocking global fetch
    global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    // 1. Fetch A
    runner.run(
      {
        kind: "fetch",
        url: "/api/long",
        abortKey: "key1",
        requestId: "req-1",
        purpose: "stress",
        onSuccess: () => ({ kind: "OK" }),
        onError: () => ({ kind: "ERR" }),
      } as FetchEffect,
      mockDispatch,
    );

    // 2. Fetch B (Same key)
    runner.run(
      {
        kind: "fetch",
        url: "/api/long",
        abortKey: "key1", // Overwrites key in map?
        requestId: "req-2",
        purpose: "stress",
        onSuccess: () => ({ kind: "OK" }),
        onError: () => ({ kind: "ERR" }),
      } as FetchEffect,
      mockDispatch,
    );

    // 3. Cancel key1
    runner.run(
      {
        kind: "cancel",
        abortKey: "key1",
      } as CancelEffect,
      mockDispatch,
    );

    // Expect abort to be called TWICE.
    // Once for the auto-cancellation of Fetch A.
    // Once for the explicit cancellation of Fetch B.
    expect(abortSpy).toHaveBeenCalledTimes(2);

    // The first controller is checking for "orphan" status.
    // In a real app, if Fetch A is still pending, it will eventually complete or timeout.
    // If it completes, it will dispatch.
    // The user MIGHT expect Fetch A to be cancelled when Fetch B starts (takeLatest).
    // The current implementation now AUTO-CANCELS!
    // This is the correct behavior.
  });

  it("Worker: handles rapid creation/spam", async () => {
    // Mock Worker is fast.
    const COUNT = 1000;
    for (let i = 0; i < COUNT; i++) {
      runner.run(
        {
          kind: "worker",
          scriptUrl: "worker.js",
          taskId: "task-1",
          payload: "echo",
          onSuccess: () => ({ kind: "OK" }),
          onError: () => ({ kind: "ERR" }),
        } as WorkerEffect,
        mockDispatch,
      );
    }

    vi.runAllTimers();

    // Should have dispatched 1000 times
    expect(mockDispatch).toHaveBeenCalledTimes(COUNT);
  });

  it("Worker: correctly handles crashes", async () => {
    runner.run(
      {
        kind: "worker",
        scriptUrl: "worker.js",
        taskId: "task-crash",
        payload: "CRASH",
        onSuccess: () => ({ kind: "OK" }),
        onError: (err: Error) => ({ kind: "WORKER_ERR", message: err.message }),
      } as WorkerEffect,
      mockDispatch,
    );

    vi.runAllTimers();

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "WORKER_ERR",
        message: expect.stringContaining("Worker error: CRASHED"),
      }),
    );
  });
});
