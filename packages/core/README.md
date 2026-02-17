# @causaloop/core

The heart of the Causaloop engine. This package is 100% platform-agnostic and contains the logic for state management, subscriptions, virtual DOM definitions, and deterministic replay.

## 📦 Key Components

### 1. Dispatcher (`dispatcher.ts`)

The central authority. It manages the `Model`, sequences `Msg` processing via a FIFO queue, coordinates with `Effect` runners, and reconciles `Subscriptions` after every update cycle.

- **Race Condition Resistance**: Prevents re-entrancy during updates.
- **Subscription Reconciliation**: Diffs active subscriptions after each commit, starting new ones and stopping stale ones automatically.
- **Restore-Safe**: Runs initial reconciliation at creation time, so subscriptions activate immediately after session restore.

### 2. Subscriptions (`subscriptions.ts`)

A declarative layer for managing ongoing processes. Features declare what subscriptions should be active based on the current model state, and the runtime manages their lifecycle.

- **`TimerSubscription`**: Periodic tick at a given interval (e.g., `setInterval`).
- **`AnimationFrameSubscription`**: Per-frame callback (e.g., `requestAnimationFrame`).
- **`diffSubscriptions()`**: Utility that computes which subscriptions to start and stop when the model changes.

### 3. Virtual DOM (`vnode.ts`)

A lightweight, serializable VDOM layer.

- **Compatibility**: Designed to be mapped to high-performance renderers like Snabbdom.
- **Serializable**: VNodes are pure data, making them easy to test and replay.

### 4. Replay Engine (`replay.ts`)

The core of Causaloop's "Time Travel" capability.

- **Deterministic**: Re-applies a log of messages to an initial state to reconstruct the exact model at any point in time.
- **Zero-Dependency**: Logic-only replay, no browser or platform interaction required.

## 🧪 Testing Core

The core is subjected to extreme stress tests to ensure reliability:

- **Throughput**: Verified to handle >1,000,000 messages per second.
- **FIFO Integrity**: Strict ordering validation under concurrent dispatch bursts.
- **Purity Enforcement**: `devMode` deep-freezing to catch accidental state mutations.

## 🛠️ Usage

```typescript
import { createDispatcher, Subscription } from "@causaloop/core";

const dispatcher = createDispatcher({
  model: initialModel,
  update: yourUpdateFunction,
  effectRunner: (effect, dispatch) => {
    /* platform-specific */
  },
  subscriptions: (model) => {
    /* return active subscriptions based on model state */
    return [];
  },
  subscriptionRunner: {
    start: (sub, dispatch) => {
      /* start the subscription */
    },
    stop: (key) => {
      /* stop subscription by key */
    },
  },
});
```

## ⚖️ License

MIT
