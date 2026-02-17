# Test Doubles & Mocks Registry

This document tracks all test doubles (mocks, stubs, spies, fakes) used across the repository to maintain isolation, determinism, and speed in our test suites.

## Strategy

We prioritize **determinism** and **speed**.

- **Unit Tests (`vitest`)**: Use deeply isolated mocks for platform globals (`fetch`, `Worker`).
- **E2E Tests (`playwright`)**: Use network interception (`page.route`) to mock backend responses, ensuring the frontend is tested in isolation from backend flakiness.

## Classifications

| Classification | Meaning                                                                                                                                                                                                                                                                       |
| :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Clean**      | **Dependency Injection**. We uses these mocks to **avoid I/O** (network, threads) in unit tests. While "clean" (passed explicitly), they are technically optional—we _could_ use real I/O, but we mock them to ensure tests are **fast, deterministic, and offline-capable**. |
| **Necessary**  | **Architectural Boundary**. These mocks are **mandatory** for the test harness to work. They represent the "edges" of the system (e.g. observing a `dispatch` call) or simulating an environment that doesn't exist in the test runner.                                       |

## Inventory

### Unit Tests (Vitest)

| Target                | Type       | Classification | Notes                                                                                                                         | Location                                               |
| :-------------------- | :--------- | :------------- | :---------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------- |
| **`fetch`**           | `vi.fn()`  | **Clean**      | Injected via `BrowserRunnerOptions`. Completely isolated from global scope.                                                   | `packages/platform-browser/src/stress/effects.test.ts` |
| **`Worker`**          | `vi.fn()`  | **Clean**      | Injected via `BrowserRunnerOptions` (factory function). Isolated from global scope.                                           | `packages/platform-browser/src/stress/effects.test.ts` |
| **`AbortController`** | `vi.spyOn` | **Clean**      | Injected via `BrowserRunnerOptions` (factory function). We spy on the created instances, avoiding global prototype pollution. | `packages/platform-browser/src/stress/effects.test.ts` |
| **`Dispatch`**        | `vi.fn()`  | **Necessary**  | Accurately reflects the architectural boundary (Output Port). Capturing messages is the "correct" way to test TEA effects.    | Various `*.test.ts` files                              |

### E2E Tests (Playwright)

| Target             | Type           | Classification | Notes                                                                                                              | Location                 |
| :----------------- | :------------- | :------------- | :----------------------------------------------------------------------------------------------------------------- | :----------------------- |
| **Network Routes** | `page.route()` | **Necessary**  | Used to produce deterministic failure modes (e.g. 500 errors) that are hard to trigger reliably on a real backend. | `tests/e2e/demo.spec.ts` |
