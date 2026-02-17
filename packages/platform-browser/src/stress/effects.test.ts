import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { BrowserRunner } from "../runners/index.js";
import { FetchEffect, WorkerEffect, CancelEffect } from "@causaloop/core";

// Mock globals
const mockDispatch = vi.fn();

describe("Stress: Effects as Data Integrity", () => {
  let runner: BrowserRunner;
  let mockFetch: Mock;
  let mockCreateWorker: Mock;
  let createdControllers: AbortController[];

  beforeEach(() => {
    mockFetch = vi.fn();
    createdControllers = [];

    // Mock Worker Factory
    mockCreateWorker = vi.fn((_url: string | URL) => {
      const listeners: {
        onmessage: ((e: MessageEvent) => void) | null;
        onerror: ((e: ErrorEvent) => void) | null;
      } = {
        onmessage: null,
        onerror: null,
      };

      return {
        set onmessage(fn: ((e: MessageEvent) => void) | null) {
          listeners.onmessage = fn;
        },
        get onmessage() {
          return listeners.onmessage;
        },
        set onerror(fn: ((e: ErrorEvent) => void) | null) {
          listeners.onerror = fn;
        },
        get onerror() {
          return listeners.onerror;
        },
        postMessage: vi.fn((data: unknown) => {
          // Simulate async processing
          setTimeout(() => {
            if (data === "CRASH") {
              if (listeners.onerror) {
                listeners.onerror({
                  type: "error",
                  message: "CRASHED",
                  filename: "worker.js",
                  lineno: 1,
                } as ErrorEvent);
              }
            } else if (data === "echo") {
              if (listeners.onmessage)
                listeners.onmessage(
                  new MessageEvent("message", { data: "echo" }),
                );
            }
          }, 10);
        }),
        terminate: vi.fn(),
      } as unknown as Worker;
    });

    runner = new BrowserRunner({
      fetch: mockFetch,
      createWorker: mockCreateWorker,
      createAbortController: () => {
        const controller = new AbortController();
        vi.spyOn(controller, "abort");
        createdControllers.push(controller);
        return controller;
      },
    });

    mockDispatch.mockClear();
    mockCreateWorker.mockClear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Fetch: handles 500 errors gracefully", async () => {
    mockFetch.mockResolvedValue({
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
    // Verify that using the same abortKey twice cancels the first request
    // and correctly cleans up controllers.


    mockFetch.mockImplementation(() => new Promise(() => { })); // Never resolves

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
        abortKey: "key1",

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

    // We should have created 2 controllers
    expect(createdControllers).toHaveLength(2);

    // Controller 1 (Fetch A) should be aborted (auto-cancel)
    expect(createdControllers[0]?.abort).toHaveBeenCalled();

    // Controller 2 (Fetch B) should be aborted (explicit cancel)
    expect(createdControllers[1]?.abort).toHaveBeenCalled();

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
    // Should have created only 4 workers (default pool size)
    expect(mockCreateWorker).toHaveBeenCalledTimes(4);
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

  it("Worker Pool: reuses idle workers", async () => {
    // 1. Run first task
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

    vi.runOnlyPendingTimers();
    await vi.waitFor(() => expect(mockDispatch).toHaveBeenCalledTimes(1));

    // 2. Run second task
    runner.run(
      {
        kind: "worker",
        scriptUrl: "worker.js",
        taskId: "task-2",
        payload: "echo",
        onSuccess: () => ({ kind: "OK" }),
        onError: () => ({ kind: "ERR" }),
      } as WorkerEffect,
      mockDispatch,
    );

    vi.runOnlyPendingTimers();
    await vi.waitFor(() => expect(mockDispatch).toHaveBeenCalledTimes(2));

    // Total worker creations should be 1 (reuse)
    expect(mockCreateWorker).toHaveBeenCalledTimes(1);
  });

  it("Worker Pool: queues tasks when pool is full", async () => {
    // Create runner with small pool
    const smallRunner = new BrowserRunner({
      createWorker: mockCreateWorker,
      maxWorkersPerUrl: 2,
    });

    // Fire 3 tasks
    for (let i = 0; i < 3; i++) {
      smallRunner.run(
        {
          kind: "worker",
          scriptUrl: "worker.js",
          taskId: `task-${i}`,
          payload: "echo",
          onSuccess: (data: unknown) => ({ kind: "OK", data }),
          onError: () => ({ kind: "ERR" }),
        } as WorkerEffect,
        mockDispatch,
      );
    }

    // Should have created only 2 workers
    expect(mockCreateWorker).toHaveBeenCalledTimes(2);

    // Run timers for first 2 tasks (10ms each in mock)
    vi.advanceTimersByTime(10);
    expect(mockDispatch).toHaveBeenCalledTimes(2);

    // Now the 3rd task should have been picked up from queue and scheduled
    // Its timer is now pending. Advance again.
    vi.advanceTimersByTime(10);
    expect(mockDispatch).toHaveBeenCalledTimes(3);

    // Still only 2 worker creations total
    expect(mockCreateWorker).toHaveBeenCalledTimes(2);
  });
});
