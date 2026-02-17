# Test Doubles & Mocks Registry

This document tracks all test doubles (mocks, stubs, spies, fakes) used across the repository to maintain isolation, determinism, and speed in our test suites.

## Strategy

We prioritize **determinism** and **speed**.

- **Unit Tests (`vitest`)**: Use deeply isolated mocks for platform globals (`fetch`, `Worker`).
- **E2E Tests (`playwright`)**: Use network interception (`page.route`) to mock backend responses, ensuring the frontend is tested in isolation from backend flakiness.

## Inventory

### Unit Tests (Vitest)

| Target                | Type       | Classification | Notes                                                                                                                                             | Location                                               |
| :-------------------- | :--------- | :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------- |
| **`global.fetch`**    | `vi.fn()`  | **Lazy**       | We mock the global because `BrowserRunner` does not accept an injected `fetch` implementation. Ideally, we should pass `fetch` as a dependency.   | `packages/platform-browser/src/stress/effects.test.ts` |
| **`global.Worker`**   | `vi.fn()`  | **Lazy**       | Flattening the `Worker` class into a simple mock is convenient, but hides complexity. We mock the global because of missing Dependency Injection. | `packages/platform-browser/src/stress/effects.test.ts` |
| **`AbortController`** | `vi.spyOn` | **Lazy**       | We spy on the prototype because we can't inspect the internal `controller` instance created inside `runFetch`.                                    | `packages/platform-browser/src/stress/effects.test.ts` |
| **`Dispatch`**        | `vi.fn()`  | **Necessary**  | Accurately reflects the architectural boundary (Output Port). Capturing messages is the "correct" way to test TEA effects.                        | Various `*.test.ts` files                              |

### E2E Tests (Playwright)

| Target             | Type           | Classification | Notes                                                                                                              | Location                 |
| :----------------- | :------------- | :------------- | :----------------------------------------------------------------------------------------------------------------- | :----------------------- |
| **Network Routes** | `page.route()` | **Necessary**  | Used to produce deterministic failure modes (e.g. 500 errors) that are hard to trigger reliably on a real backend. | `tests/e2e/demo.spec.ts` |
