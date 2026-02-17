<div align="center">
  <img src="logo.png" width="160" height="160" alt="Causaloop Logo">
  <h1>Causaloop</h1>
  <p><strong>A production-grade TypeScript monorepo template for deterministic, effect-safe MVU applications.</strong></p>

[![CI](https://github.com/bitkojine/causaloop/actions/workflows/ci.yml/badge.svg)](https://github.com/bitkojine/causaloop/actions/workflows/ci.yml)
[![E2E Tests](https://github.com/bitkojine/causaloop/actions/workflows/e2e.yml/badge.svg)](https://github.com/bitkojine/causaloop/actions/workflows/e2e.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)

</div>

---

<!-- CI_CONCURRENCY_TEST_2 -->

## 🧐 Why Causaloop?

In modern web development, managing state and side effects often leads to "spaghetti code" that is hard to test and impossible to reproduce. **Causaloop** solves this by strictly enforcing **The Elm Architecture (TEA)** principles in TypeScript.

It’s built on the belief that:

- 🎯 **State should be predictable**: Managed by a single, authoritative dispatcher.
- 📦 **Effects should be data**: Side effects (Fetch, Timer, Workers) are pure data structures until the final execution boundary.
- 📼 **Bugs should be replayable**: Any UI state can be reconstructed exactly from a message log.

---

## ✨ Key Features

- **⚡ Virtual DOM Rendering** `[Ready]`  
  High-performance UI reconciliation using Snabbdom, throttled to microtask batches for maximum efficiency.
- **🛡️ 100% Type Safety** `[Ready]`  
  Zero `any` types across the entire monorepo, strictly enforced in CI.
- **🧪 Deterministic Replay** `[Ready]`  
  Export and import message logs to reproduce issues across sessions. Supports `localStorage` persistence.
- **🤖 Worker Pool** `[Ready]`  
  Scalable background computation with persistent worker orchestration and task queuing.
- **🏗️ Monorepo First** `[Ready]`  
  Powered by `pnpm` workspaces and TypeScript Project References.
- **🎭 Modern E2E Suite** `[Ready]`  
  Comprehensive Playwright coverage including chaotic monkey testing for resilience verification.
- **⚙️ Effect Isolation** `[Ready]`  
  Pure logic in `@causaloop/core`, platform-specific runners in `@causaloop/platform-browser`.

---

## 📊 Project Maturity

| Feature                  | Status  | Confidence | Notes                                                            |
| :----------------------- | :------ | :--------- | :--------------------------------------------------------------- |
| **MVU Core**             | `Ready` | High       | Hardened against high-frequency throughput (100k+ msg/tick).     |
| **Snabbdom VDOM**        | `Ready` | High       | Throttled rendering ensures smooth UI even under message storms. |
| **Deterministic Replay** | `Ready` | High       | Fully reproducible cross-session replay via persistent logs.     |
| **Web Workers**          | `Ready` | High       | Robust Worker Pool with concurrency limits and queuing.          |
| **CI/CD Enforcer**       | `Ready` | High       | Static checks are binary and highly reliable.                    |

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20.0.0
- [pnpm](https://pnpm.io/) >= 10.0.0

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

### Testing & Quality

```bash
pnpm test          # Unit & Integration tests
pnpm test:stress   # Performance & Race condition stress tests
pnpm test:e2e      # Playwright E2E suite
pnpm lint          # ESLint boundary enforcement
pnpm format        # Prettier formatting
```

### Test Doubles & Mocks

For a detailed inventory of mocks, spies, and fakes used in this project (including E2E network interception), see [TEST_DOUBLES.md](./TEST_DOUBLES.md).

---

## 📂 Project Structure

```text
.
├── packages/
│   ├── core/              # Runtime-agnostic engine (Dispatcher, VNode, Replay)
│   ├── platform-browser/   # Browser-specific effect runners (Fetch, Timer, RAF)
│   └── app-web/           # Demo application (Search, Timer, Animation, Workers)
├── tests/
│   └── e2e/               # Playwright test suite
└── .github/workflows/     # CI/CD (Main CI, E2E, and Stress/Stability workflows)
```

---

## 🧪 TEA Compliance Audit

Causaloop is continuously audited against **The Elm Architecture (TEA)** baseline.

### ✅ Alignments

- **Single Model**: Centralized authority in the `Dispatcher`.
- **Message-Driven**: State transitions only happen via `Msg` objects.
- **Declarative Effects**: Side effects are data structures, not executions.
- **FIFO Processing**: Serialized message queue prevents race conditions.
- **Batch Rendering**: UI notifications are deferred to microtasks to prevent redundant renders during message bursts.

### 🚧 Structural Integrity

- **Boundary Enforcement**: ESLint rules prevent `@causaloop/core` from importing impure platform globals.
- **Type Rigor**: 100% project-wide type safety with automated "forbidden-comment" checks in CI.

---

## 🛣️ Roadmap

### 🔭 Future Vision

- [ ] **Context Injection**: Updates to the `UpdateFn` signature to include explicit `Time` and `Random` providers for 100% pure randomness/time.
- [ ] **Model Validation**: `devMode` invariants to verify model serializability.
- [ ] **SSR Support**: Node.js effect runners for server-side rendering.
- [ ] **Time-Travel Debugger UI**: A standalone visual interface for scrubbing through exported logs.

---

## 🤝 Contributing

Contributions are welcome! Please ensure that:

1. All new code is 100% typed (no `any`).
2. New features include appropriate unit or E2E tests.
3. Documentation corresponds to code changes.

---

## ⚖️ License

MIT © [Causaloop Contributors](./LICENSE)
