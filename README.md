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

## 🧐 Why Causaloop?

In modern web development, managing state and side effects often leads to "spaghetti code" that is hard to test and impossible to reproduce. **Causaloop** solves this by strictly enforcing **The Elm Architecture (TEA)** principles in TypeScript.

It’s built on the belief that:

- 🎯 **State should be predictable**: Managed by a single, authoritative dispatcher.
- 📦 **Effects should be data**: Side effects (Fetch, Timer, Workers) are pure data structures until the final execution boundary.
- 📼 **Bugs should be replayable**: Any UI state can be reconstructed exactly from a message log.

---

## ✨ Key Features

- **⚡ Virtual DOM Rendering**: High-performance UI reconciliation using Snabbdom.
- **🛡️ 100% Type Safety**: Zero `any` types across the entire monorepo, strictly enforced in CI.
- **🧪 Deterministic Replay**: Export message logs to reproduce and debug production issues locally.
- **🏗️ Monorepo First**: Powered by `pnpm` workspaces and TypeScript Project References.
- **🎭 Modern E2E Suite**: Comprehensive Playwright coverage running in dedicated CI workflows.
- **⚙️ Effect Isolation**: Pure logic in `@causaloop/core`, platform-specific runners in `@causaloop/platform-browser`.

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20.0.0
- [pnpm](https://pnpm.io/) >= 9.0.0

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Testing & Quality

```bash
npm run test        # Unit & Integration tests
npm run test:e2e    # Playwright E2E suite
npm run lint        # ESLint boundary enforcement
npm run format      # Prettier formatting
```

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
└── .github/workflows/     # CI/CD (Main CI & Separate E2E)
```

---

## 🧪 TEA Compliance Audit

Causaloop is continuously audited against **The Elm Architecture (TEA)** baseline.

### ✅ Alignments

- **Single Model**: Centralized authority in the `Dispatcher`.
- **Message-Driven**: State transitions only happen via `Msg` objects.
- **Declarative Effects**: Side effects are data structures, not executions.
- **FIFO Processing**: Serialized message queue prevents race conditions.

### 🌓 Resolved Deviations

- **Declarative View**: We've transitioned from surgical DOM updates to a proper **Virtual DOM** (Snabbdom) for UI reconciliation.

### 🚧 Structural Integrity

- **Boundary Enforcement**: ESLint rules prevent `@causaloop/core` from importing impure platform globals.
- **Type Rigor**: 100% project-wide type safety with automated "forbidden-comment" checks in CI.

---

## 🛣️ Roadmap

- [ ] **Snapshot Persistence**: Implement automatic state recovery from `localStorage`.
- [ ] **Context Injection**: Update the `UpdateFn` signature to explicitly include injected providers (Time, Random).
- [ ] **Worker Pool**: persistent workers for high-frequency background tasks.
- [ ] **SSR Support**: Extend `platform-browser` with a Node provider for server-side rendering.

---

## 🤝 Contributing

Contributions are welcome! Please ensure that:

1. All new code is 100% typed (no `any`).
2. New features include appropriate unit or E2E tests.
3. Documentation corresponds to code changes.

---

## ⚖️ License

MIT © [Causaloop Contributors](./LICENSE)
