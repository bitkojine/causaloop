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
