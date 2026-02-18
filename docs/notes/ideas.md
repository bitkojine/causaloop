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

## Replay Safety: "Phantom Pending" Bug Class

TEA models store "in-flight" states (e.g. `status: "loading"`, `isRunning: true`) as regular serializable data. But these states represent a **relationship to a running effect** — and effects don't survive serialization. After restore/replay, the model says "I'm waiting for a response" but nothing is actually running. The UI is permanently stuck.

This is structural, not a one-off oversight. Any new feature with an async state can introduce it silently.

### Current workaround

Manual model normalization in `main.ts` after `replay()` — resetting each feature's in-flight state to idle. This is error-prone: every new feature must remember to add its own normalization.

### Proposed framework-level fix: Subscriptions

Elm solves this with **Subscriptions** — a declarative layer where the runtime asks: "given this model, which effects should be running right now?"

For self-scheduling features (timer, animation, stress), instead of:

- `timer_started` → set `isRunning: true` + fire `setTimeout` effect
- `timer_ticked` → fire next `setTimeout` effect (self-scheduling chain)

The pattern becomes:

- `subscriptions(model)` returns `[timerSub(1000)]` when `model.timer.isRunning === true`
- The runtime manages the lifecycle: starts on subscribe, stops on unsubscribe, **restarts after restore**

This eliminates the bug class entirely for ongoing processes. For one-shot effects (fetch, worker), a lighter `normalize()` convention or `TransientField` type marker could work.

### Impact

Adding subscriptions to `@causaloop/core` would:

1. Eliminate phantom pending bugs by design (not by convention)
2. Align with Elm's architecture more faithfully
3. Make replay/restore safe by default — the framework's core value proposition
4. Position Causaloop as solving a problem that even Elm sidesteps rather than solves

### Conditional subscription pausing

The `subscriptions` function receives the current model, which enables conditionally starting or stopping subscriptions based on state. No consumer currently exercises this — causal-factory's `subscriptions` function ignores the model parameter entirely (always returns the same animationFrame subscription).

Potential use cases:

- Return an empty array when `model.isPaused === true` to pause the game loop
- Start a countdown timer subscription only during a specific game phase
- Switch from animationFrame to a slower timer when entity count exceeds a threshold

- Switch from animationFrame to a slower timer when entity count exceeds a threshold

The dispatcher already handles subscription diffing (`diffSubscriptions`) — adding/removing subscriptions between commits is fully supported. This just needs a real consumer to exercise it.

## Zero Console Policy

This repository implements a strict zero-console policy for all source code.

- All `console.log`, `console.info`, and `console.error` calls are prohibited in `packages/*/src`.
- This ensures that production logs are clean and prevents side-channel information leaks.
- Error handling must be managed via the MVU pattern (dispatching error messages) or silent failures where appropriate, rather than simple console output.
- Enforcement is handled via ESLint (`no-console: "error"`) and a pre-push regex check.

## Library Adoption Audit (causal-factory case study)

An audit of the `causal-factory` implementation reveals a divergence between the library's available features and its real-world application.

### Under-utilization of Framework Features

- **UI Overlay via `innerHTML`**: The game manually updates overlays using string templates in the renderer. It should migrate to the library's **Snabbdom-based VNode system** (`createSnabbdomRenderer`).
- **Raw `setInterval` for AutoPilot**: The game uses external timers for autopilot logic. This should be refactored into a **`TimerSubscription`**, allowing the engine to manage the lifecycle and enabling features like "pause" to work across the entire simulation.
- **Global `latestSnapshot`**: The game caches the latest state in a mutable global for external access. Using the library's **`subscribe()`** method would allow for a more robust, event-driven architecture.

### Feature Gaps in the Library

- **Declarative Canvas API**: While the library handles HTML/SVG via VDOM, it lacks a standard way to express **Canvas operations** declaratively. This forces games to build manual, imperative renderers.
- **Empty DevTools**: The engine's core value is determinism, but the `devtools` package is currently empty. It should provide standard components for **log inspection, time-travel, and state diffing**.
- **Performance Middleware**: Logic for `tickTime` and `fps` tracking is currently implemented in the game. These are generic metrics that the library could provide as part of the `Dispatcher`.

### Implementation Redundancy

- **Manual Replay Validation**: The game implements its own determinism check (JSON string comparison). This should be a first-class feature of the library (e.g., `dispatcher.verifyDeterminism()`).
- **Generic Metrics**: Calculating average tick times over a rolling frame buffer is logic that belongs in a library utility rather than UI code.

### Summary of Integration Recommendations

1. Refactor **AutoPilot** into a Library Subscription.
2. Migrated **UI Overlay** to the Library's `createSnabbdomRenderer`.
3. Start implementing the **DevTools** package to replace the manual `alert()` replay check.
