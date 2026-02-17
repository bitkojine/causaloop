# Ideas and Architectural Notes

## Core MVU

- **Recursion traversal**: The dispatcher converts recursion to iteration via the queue loop. This allows for deep recursive updates (up to 50k+) without blowing the stack. This is a key feature for stability.
- **Synchronous Re-entrancy**: Dispatched messages triggered by synchronous effects are strictly FIFO. If `Update(A)` triggers `Effect(B)`, `Dispatch(B)` is queued and processed _after_ the current loop tick (or next in queue), ensuring strictly predictable state transitions (`A -> B -> C`).

## Browser Platform

- **AbortKey Behavior**: If a fetch request with an `abortKey` is started while another with the same key is pending, the first is auto-cancelled. This implements a "takeLatest" strategy by default.
- **Dispatcher Batching**: The dispatcher processes the entire message queue before notifying subscribers, ensuring UI updates are batched. Effects, however, are executed immediately during the loop.
- **Renderer Defaults**: The Snabbdom renderer automatically calls `preventDefault()` on form `submit` events.
- **Core Concepts**:
  - **Model**: Authoritative state, must be JSON-serializable and immutable.
  - **Messages**: The only way to trigger state changes.
  - **Effects**: Side effects expressed as data.
  - **Snapshot**: A derived, immutable view of the model for the UI.

## Safety Mechanisms

- **Deep Freezing**: In `devMode`, the dispatcher recursively freezes the new model after every update. This guarantees immutability and prevents accidental state mutation, which is essential for reliable time-travel debugging.
- **UI Update Coalescing**: Subscriber notifications are wrapped in a microtask (`Promise.resolve().then`). This ensures that even if the message queue is drained synchronously, the UI only re-renders once per event loop tick, improving performance.

## Concurrency & Resources

- **Worker Pool Strategy**: `BrowserRunner` implements a "lazy-grow, cap-and-queue" strategy for Workers:
  1.  Reuse idle workers for the same script URL.
  2.  Create new workers up to `maxWorkersPerUrl` (default 4).
  3.  Queue requests if the pool is saturated.
- **AbortController Cleanup**: The runner aggressively cleans up `AbortController` instances in the `.finally` block of fetch effects. This prevents memory leaks, especially in high-throughput scenarios where thousands of requests might process rapidly.
