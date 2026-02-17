# Causaloop

A production-grade TypeScript monorepo template focused on a strict **Model-View-Update (MVU)** architecture with deterministic replayability.

## Core Philosophy

Causaloop is built on the belief that application state should be predictable, side effects should be managed as data, and debugging should be a matter of replaying logs. It enforces a strict separation between the pure "business logic" and the impure "effect runners".

### Key Architectural Invariants

- **Single-Writer View-State**: Only the Dispatcher can update the application state.
- **Effects as Data**: Side effects (Fetch, Timer, Workers) are returned as data structures, not executed inside logic.
- **Serialized Dispatching**: Messages are processed sequentially to prevent race conditions.
- **Immutable Snapshots**: State is deep-frozen in development to catch accidental mutations.
- **Deterministic Replay**: The entire application state can be reconstructed from a message log and an initial model.

## Monorepo Structure

The project uses `pnpm` workspaces and TypeScript project references:

- **`packages/core`**: The runtime-agnostic MVU engine. Includes the Dispatcher, Replay logic, and core type definitions.
- **`packages/platform-browser`**: Browser-specific effect runners for Fetch, Timers, Animation Frames, and Web Workers.
- **`packages/app-web`**: A comprehensive demo application showcasing:
  - Stale-response-safe search.
  - Request cancellation.
  - Animation frame loops.
  - Offloaded background computation (Web Workers).
  - DevTools for log export and deterministic replay.

## Features & Implementation

### Stale-Response-Safe Search
Uses `requestId` correlation to ensure that if multiple search requests are in flight, only the response corresponding to the *latest* request update the UI state.

### DevTools & Time Travel
The integrated DevTools panel captures every message dispatched in the system. These logs can be exported to JSON and replayed against the initial state to reproduce any UI state exactly.

## Getting Started

### Prerequisites
- Node.js >= 20.0.0
- pnpm

### Installation
```bash
npx pnpm install
```

### Development
```bash
npx pnpm dev
```

### Testing & Linting
```bash
npx pnpm test  # Runs Vitest for core and app integration
npx pnpm lint  # Runs ESLint with boundary enforcement
```

## Open Questions & Review Required

> [!IMPORTANT]
> The following areas are implemented but could benefit from further clarification or refinement.

- **Effect Granularity**: Currently, the `BrowserRunner` handles a standard set of effects. Should we implement a plugin system for third-party effect runners?
- **Snapshot Persistence**: We have JSON-based log export. Should we implement an automatic "state recovery" from `localStorage` on reload?
- **Deterministic Randomness**: While `RandomProvider` is implemented in types, how strictly should we enforce it across all features to ensure 100% replay accuracy?
- **Worker Management**: Currently, the Worker runner terminates the worker after each task. For high-frequency tasks, should we implement a worker pool or persistent workers?
- **Middleware Support**: Does the MVU flow need a formal middleware layer (e.g., for analytics) or should those be handled as standard messages/effects?

## License

MIT - See [LICENSE](./LICENSE) for details.

### Surgical Updates

In the absence of a Virtual DOM, Causaloop uses a "Surgical Update" pattern for high-frequency state changes (e.g., animations, timers). Instead of nuking and rebuilding the entire component's DOM on every state change, the rendering loop identifies specific elements and updates only the necessary properties (like `style.transform` or `innerText`). This ensures DOM nodes remain stable, preserving focus, selection, and allowing reliable user interaction even during rapid state transitions.

---

## TEA Compliance Audit

This audit evaluates `causaloop` against the baseline principles of **The Elm Architecture (TEA)** to identify alignments, deviations, and architectural risks.

## 1. Confirmed Alignments with TEA

- **Single Model**: The application state is stored in a single, authoritative `currentModel` within the `Dispatcher`.
- **Message-Driven Transitions**: State changes are triggered exclusively by `Msg` objects. There is no direct setter or multi-authority state logic.
- **Declarative Effects**: Side effects are returned as data structures (`Effect`) and never executed within the logic layer.
- **FIFO Message Processing**: The dispatcher uses a message queue and an `isProcessing` lock to ensure serial processing and prevent race conditions or partial state application.
- **MVU Isolation**: Core business logic is strictly decoupled from platform-specific side effects via package boundaries and ESLint rules.

## 2. Partial Alignments

- **Immutability**: Enforced via `deepFreeze` and `Readonly` types, but primarily active in `devMode`. Production relies on developer discipline rather than runtime enforcement.
- **Replay Determinism**: A `replay` function exists, but it lacks a mechanism to inject `Time` or `Random` results directly into the `update` function logic, relying instead on timestamps captured in the log.
- **Provider Injection**: `TimeProvider` and `RandomProvider` are available to the `Dispatcher`, but not currently consumed by the `update` function signature, limiting their utility for standard TEA tasks like `Random.generate`.

## 3. Deviations from TEA

- **Construction-based View**: **[CRITICAL]** In Elm, `view` returns a declarative Virtual DOM (`Html msg`). In `causaloop`, `view` functions directly construct and return real `HTMLElement` objects.
    - **Risk**: This bypasses the projection-based nature of TEA. State updates require manual DOM clearing or mutation rather than declarative reconciliation.
    - **Reference**: `packages/app-web/src/main.ts` line 29: `appRoot.innerHTML = '';`
- **Logic-Side Effect Wrapping**: Features wrap their own messages in the `update` function.
    - **Risk**: While standard in TEA, the current implementation manually maps effects in `app.ts`, which adds boilerplate and potential for manual wrapping errors.
- **No Native Subscriptions**: `causaloop` lacks a formal `subscriptions` system (like Elm's `Sub msg`). RAF and Timers are modeled as one-shot commands that must be re-queued, rather than continuous streams.

## 4. Structural Weaknesses

- **TypeScript Type Gaps**: TypeScript cannot enforce that a `Model` is strictly serializable or free of hidden functions/circular references at compile time.
- **Developer Restraint**: The system allows developers to access globals (`window`, `localStorage`, `Date.now()`) within the `update` function. Unlike Elm, the compiler does not sandbox the logic.
- **Runtime Validation**: There is no runtime schema validation (e.g., Zod) for incoming messages, making it possible for malformed data to enter the pure update loop.

## 5. Determinism Gaps

- **Effect Execution Timing**: Effects are executed after the model update but before the next message in the queue is processed. If an effect runner dispatches synchronously, it may alter the "expected" message order in complex race conditions compared to Elm's runtime.
- **Implicit Impurity**: The `update` function signature `(model, msg) => UpdateResult` lacks a "context" argument for injected providers, tempting developers to use side-effectful globals.

## 6. Dual-Authority Risks

- **DOM state vs Model state**: Because `view` returns live elements, it is possible for a component to hold internal DOM state (e.g., an unmanaged input value) that is not mirrored in the `Model`. This breaks the "Single Source of Truth" guarantee.

## 7. Enforcement Gaps

- **Model Serializability**: Documentation claims `Model` must be JSON-serializable, but this is not enforced by lints or invariants.
- **Update Purity**: No ESLint rule currently prevents referencing `Date` or `Math.random` inside `packages/core`.

## 8. Recommendations for Hardening

- **Virtual DOM Integration**: Transition the `view` layer to return a declarative UI representation (e.g., VNode) to ensure projection-based rendering.
- **Context Injection**: Update the `UpdateFn` signature to `(model, msg, context) => UpdateResult`, where `context` provides access to injected `Time` and `Random` providers.
- **Strict Serialization Check**: Add a `devMode` invariant that verifies the `Model` can be successfully round-tripped through `JSON.stringify/parse`.
- **Sandbox Lints**: Implement ESLint rules for `packages/core` that forbid access to `window`, `document`, and non-deterministic globals like `Date`.
- **Formal Subscriptions**: Introduce a `subscriptions: (model) => Sub msg` function to manage continuous side effects like RAF and UI events.
