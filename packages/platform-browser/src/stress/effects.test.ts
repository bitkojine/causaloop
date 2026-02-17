import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { BrowserRunner } from "../runners/index.js";
import { FetchEffect, WorkerEffect, CancelEffect } from "@causaloop/core";
const mockDispatch = vi.fn();
describe("Stress: Effects as Data Integrity", () => {
  let runner: BrowserRunner;
  let mockFetch: Mock;
  let mockCreateWorker: Mock;
  let createdControllers: AbortController[];
  beforeEach(() => {
    mockFetch = vi.fn();
    createdControllers = [];
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
    await vi.waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "ERROR" }),
      );
    });
  });
  it("Fetch: handles abortKey overwrite (Leak detection)", async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
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
    runner.run(
      {
        kind: "cancel",
        abortKey: "key1",
      } as CancelEffect,
      mockDispatch,
    );
    expect(createdControllers).toHaveLength(2);
    expect(createdControllers[0]?.abort).toHaveBeenCalled();
    expect(createdControllers[1]?.abort).toHaveBeenCalled();
  });
  it("Worker: handles rapid creation/spam", async () => {
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
    expect(mockDispatch).toHaveBeenCalledTimes(COUNT);
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
    expect(mockCreateWorker).toHaveBeenCalledTimes(1);
  });
  it("Worker Pool: queues tasks when pool is full", async () => {
    const smallRunner = new BrowserRunner({
      createWorker: mockCreateWorker,
      maxWorkersPerUrl: 2,
    });
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
    expect(mockCreateWorker).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(10);
    expect(mockDispatch).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(10);
    expect(mockDispatch).toHaveBeenCalledTimes(3);
    expect(mockCreateWorker).toHaveBeenCalledTimes(2);
  });
});
