# @causaloop/platform-browser

Platform-specific implementation for running Causaloop applications in web browsers. This package bridges the pure logic of `@causaloop/core` with the real-world side effects of the web.

## 📦 Key Components

### 1. Unified Runner (`runners/index.ts`)

A robust execution engine for the most common web effects.

- **Fetch**: Managed network requests with built-in `AbortController` support and duplicate request cancellation via `abortKey`.
- **Timer**: Serialized timer execution aligned with the MVU message queue.
- **Animation Frame (RAF)**: High-performance frame synchronization for smooth animations.
- **Web Workers**: A persistent worker pool that manages task queuing and worker reuse.

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
// Use this runner with your @causaloop/core dispatcher
```

## ⚖️ License

MIT
