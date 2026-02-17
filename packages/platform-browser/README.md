# @causaloop/platform-browser

Platform-specific implementation for running Causaloop applications in web browsers. This package bridges the pure logic of `@causaloop/core` with the real-world side effects of the web.

## 📦 Key Components

### 1. Unified Runner (`runners/index.ts`)

A robust execution engine for web effects and subscriptions.

**Effects** (one-shot operations):

- **Fetch**: Managed network requests with built-in `AbortController` support and duplicate request cancellation via `abortKey`.
- **Web Workers**: A persistent worker pool that manages task queuing, timeouts, and worker replacement on failure.

**Subscriptions** (ongoing, runtime-managed):

- **Timer**: `setInterval`-based ticks, keyed for clean start/stop lifecycle.
- **Animation Frame (RAF)**: `requestAnimationFrame` loops with cancellation flags, keyed for clean start/stop lifecycle.

Both subscription types are managed via `startSubscription(sub, dispatch)` and `stopSubscription(key)` methods, called by the core Dispatcher during reconciliation.

### 2. Snabbdom Renderer (`renderer.ts`)

The bridge between Causaloop VNodes and the real DOM.

- **Snabbdom Integration**: Uses the industry-standard Snabbdom library for efficient patching.
- **Optimized Patching**: Minimizes DOM mutations by only updating what changed.

## 🧪 Browser Stress Testing

This package is battle-tested in a simulated browser environment (JSDOM/Playwright):

- **Timer Storms**: Verified to handle thousands of concurrent timers without starvation.
- **Fetch Races**: Reliability checks for rapid request/cancel cycles.
- **RAF Backlogs**: Ensuring animation frames are processed consistently under heavy UI load.

## 🛠️ Usage

```typescript
import { BrowserRunner } from "@causaloop/platform-browser";

const runner = new BrowserRunner();

runner.startSubscription(timerSub, dispatch);
runner.stopSubscription("timer:my-key");
```

## ⚖️ License

MIT
