# @causaloop/core

The heart of the Causaloop engine. This package is 100% platform-agnostic and contains the logic for state management, virtual DOM definitions, and deterministic replay.

## 📦 Key Components

### 1. Dispatcher (`dispatcher.ts`)

The central authority. It manages the `Model`, sequences `Msg` processing via a FIFO queue, and coordinates with `Effect` runners.

- **Race Condition Resistance**: Prevents re-entrancy during updates.
- **Batching**: Throttles state notifications to optimize rendering.

### 2. Virtual DOM (`vnode.ts`, `h.ts`)

A lightweight, serializable VDOM layer.

- **Compatibility**: Designed to be mapped to high-performance renderers like Snabbdom.
- **Serializable**: VNodes are pure data, making them easy to test and replay.

### 3. Replay Engine (`replay.ts`)

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
import { createDispatcher } from "@causaloop/core";

const dispatcher = createDispatcher({
  model: initialModel,
  update: yourUpdateFunction,
  effectRunner: (effect, dispatch) => {
    /* platform-specific */
  },
});
```

## ⚖️ License

MIT
