# Test Doubles & Mocks Registry

This document tracks all test doubles (mocks, stubs, spies, fakes) used across the repository to maintain isolation, determinism, and speed in our test suites.

## Strategy

We prioritize **determinism** and **speed**.

- **Unit Tests (`vitest`)**: Use deeply isolated mocks for platform globals (`fetch`, `Worker`).
- **E2E Tests (`playwright`)**: Use network interception (`page.route`) to mock backend responses, ensuring the frontend is tested in isolation from backend flakiness.

## Classifications

| Classification | Meaning                                                                                                                                                                                                                                 |
| :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DI**         | **Dependency Injection**. The dependency is passed explicitly to the runner/consumer. This allows us to inject usage-specific mocks (preventing global pollution) and run tests in complete isolation without side-effects.             |
| **Mandatory**  | **Architectural Boundary**. These mocks are **mandatory** for the test harness to work. They represent the "edges" of the system (e.g. observing a `dispatch` call) or simulating an environment that doesn't exist in the test runner. |

## Inventory

### Unit Tests (Vitest)

| Target                | Type       | Classification | Notes                                                                                                                                                              | Location                                               |
| :-------------------- | :--------- | :------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------- |
| **`fetch`**           | `vi.fn()`  | **DI**         | Injected via `BrowserRunnerOptions`. Completely isolated from global scope. Used to verify auto-cancellation and race resistance.                                  | `packages/platform-browser/src/stress/effects.test.ts` |
| **`Worker`**          | `vi.fn()`  | **DI**         | Custom Fake: Overrides `postMessage` to simulate delay/crash and handles `onmessage`/`onerror` listeners. Used to verify Worker Pool reuse and task queuing logic. | `packages/platform-browser/src/stress/effects.test.ts` |
| **`AbortController`** | `vi.spyOn` | **DI**         | Injected via factory function. We spy on the created instances to verify that `.abort()` is called during Fetch auto-cancellation or explicit Cancel effects.      | `packages/platform-browser/src/stress/effects.test.ts` |
| **`Dispatch`**        | `vi.fn()`  | **Mandatory**  | Architectural Boundary (Output Port). Capturing messages is the only way to verify that effects correctly translate side-effect results back into the MVU cycle.   | Various `*.test.ts` files                              |
| **`vnode.h`**         | `h()`      | **DI**         | Snabbdom virtual node factory. Injected into the renderer to allow assertions on the generated view tree without a full DOM environment.                           | `packages/platform-browser/src/renderer.ts`            |

### E2E Tests (Playwright)

| Target             | Type           | Classification | Notes                                                                                                              | Location                 |
| :----------------- | :------------- | :------------- | :----------------------------------------------------------------------------------------------------------------- | :----------------------- |
| **Network Routes** | `page.route()` | **Mandatory**  | Used to produce deterministic failure modes (e.g. 500 errors) that are hard to trigger reliably on a real backend. | `tests/e2e/demo.spec.ts` |
