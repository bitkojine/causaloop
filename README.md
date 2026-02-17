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
  - Request cancellation (Fetch).
  - High-frequency animation frame loops.
  - Offloaded background computation (Web Workers).
  - DevTools for log export and deterministic replay.
  - Modern E2E testing suite (Playwright).

## Features & Implementation

### Stale-Response-Safe Search

Uses `requestId` correlation to ensure that if multiple search requests are in flight, only the response corresponding to the _latest_ request updates the UI state.

### High-Frequency Animation (Surgical Updates)

In the absence of a Virtual DOM, Causaloop uses a **Surgical Update** pattern for high-frequency state changes (e.g., animations, timers). Instead of nuking and rebuilding the entire component's DOM on every state change, the rendering loop identifies specific elements and updates only the necessary properties (like `style.transform` or `innerText`). This ensures DOM nodes remain stable, preserving focus, selection, and allowing reliable user interaction even during rapid state transitions.

### Request Cancellation

Demonstrates the use of `AbortController` via the `FetchEffect`. The demo app allows users to trigger a large data fetch and cancel it mid-flight, restoring the system to an `idle` state deterministically.

### Web Worker Computation

Offloads intensive prime number calculations to a dedicated Web Worker. The transition from `computing` to `done` is handled via message passing, ensuring the UI remains responsive throughout.

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
npx pnpm test            # Runs Vitest for core and app integration
npx pnpm lint            # Runs ESLint with boundary enforcement
npx playwright test      # Runs Playwright E2E suite
```

## Open Questions & Review Required

> [!IMPORTANT]
> The following areas are implemented but could benefit from further clarification or refinement.

- **Virtual DOM Integration**: Should we transition the `view` layer to a proper VDOM (e.g., Snabbdom) to replace the current surgical update pattern?
- **Effect Granularity**: Currently, the `BrowserRunner` handles a standard set of effects. Should we implement a plugin system for third-party effect runners?
- **Snapshot Persistence**: We have JSON-based log export. Should we implement an automatic "state recovery" from `localStorage` on reload?
- **Deterministic Randomness**: While `RandomProvider` is implemented in types, how strictly should we enforce it across all features to ensure 100% replay accuracy?
- **Worker Management**: Currently, the Worker runner terminates the worker after each task. For high-frequency tasks, should we implement a worker pool or persistent workers?

## License

MIT - See [LICENSE](./LICENSE) for details.

---

## TEA Compliance Audit

This audit evaluates `causaloop` against the baseline principles of **The Elm Architecture (TEA)** to identify alignments, deviations, and architectural risks.

### 1. Confirmed Alignments with TEA

- **Single Model**: The application state is stored in a single, authoritative `currentModel` within the `Dispatcher`.
- **Message-Driven Transitions**: State changes are triggered exclusively by `Msg` objects. There is no direct setter or multi-authority state logic.
- **Declarative Effects**: Side effects are returned as data structures (`Effect`) and never executed within the logic layer.
- **FIFO Message Processing**: The dispatcher uses a message queue and an `isProcessing` lock to ensure serial processing and prevent race conditions or partial state application.
- **MVU Isolation**: Core business logic is strictly decoupled from platform-specific side effects via package boundaries and ESLint rules.

### 2. Partial Alignments

- **Immutability**: Enforced via `deepFreeze` and `Readonly` types, but primarily active in `devMode`. Production relies on developer discipline rather than runtime enforcement.
- **Replay Determinism**: A `replay` function exists, but it lacks a mechanism to inject `Time` or `Random` results directly into the `update` function logic, relying instead on timestamps captured in the log.
- **Provider Injection**: `TimeProvider` and `RandomProvider` are available to the `Dispatcher`, but not currently consumed by the `update` function signature.

### 3. Deviations from TEA

- **Construction-based View**: **[CRITICAL]** In Elm, `view` returns a declarative Virtual DOM (`Html msg`). In `causaloop`, `view` functions directly construct and return real `HTMLElement` objects.
  - **Mitigation**: The project uses a **Surgical Update** pattern in `main.ts` to stabilize DOM nodes during high-frequency updates, bridging the gap between direct DOM manipulation and VDOM reconciliation.
  - **Reference**: `packages/app-web/src/main.ts` (Surgical rendering logic).
- **Logic-Side Effect Wrapping**: Features wrap their own messages in the `update` function.
  - **Risk**: Manual mapping of effects in `app.ts` adds boilerplate and potential for manual wrapping errors.
- **No Native Subscriptions**: `causaloop` lacks a formal `subscriptions` system (like Elm's `Sub msg`). RAF and Timers are modeled as one-shot commands that must be re-queued.

### 4. Structural Weaknesses

- **TypeScript Type Gaps**: TypeScript cannot enforce that a `Model` is strictly serializable or free of hidden functions/circular references at compile time.
- **Developer Restraint**: The system allows developers to access globals (`window`, `localStorage`, `Date.now()`) within the `update` function.
- **Runtime Validation**: There is no runtime schema validation (e.g., Zod) for incoming messages.

### 5. Determinism Gaps

- **Effect Execution Timing**: Effects are executed after the model update but before the next message in the queue.
- **Implicit Impurity**: The `update` function signature `(model, msg) => UpdateResult` lacks a "context" argument for injected providers.

### 6. Dual-Authority Risks

- **DOM state vs Model state**: Because `view` returns live elements, it is possible for a component to hold internal DOM state (e.g., an unmanaged input value).
  - **Verification**: The comprehensive Playwright E2E suite verifies that the UI state consistently mirrors the intended Model state across complex interactions.

### 7. Enforcement Gaps

- **Model Serializability**: Not enforced by lints or invariants.
- **Update Purity**: No ESLint rule currently prevents referencing `Date` or `Math.random` inside `packages/core`.

### 8. Recommendations for Hardening

- **Virtual DOM Integration**: Transition the `view` layer to a VNode implementation.
- **Context Injection**: Update the `UpdateFn` signature to include injected providers.
- **Strict Serialization Check**: Add a `devMode` invariant that verifies JSON round-tripping.
- **Sandbox Lints**: Implement ESLint rules to forbid access to browser globals in `packages/core`.
- **Formal Subscriptions**: Introduce a `subscriptions` function to manage continuous side effects.
