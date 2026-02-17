# Test Doubles & Mocks Registry

This document tracks all test doubles (mocks, stubs, spies, fakes) used across the repository to maintain isolation, determinism, and speed in our test suites.

## Strategy

We prioritize **determinism** and **speed**.

- **Unit Tests (`vitest`)**: Use deeply isolated mocks for platform globals (`fetch`, `Worker`).
- **E2E Tests (`playwright`)**: Use network interception (`page.route`) to mock backend responses, ensuring the frontend is tested in isolation from backend flakiness.

## Inventory

### Unit Tests (Vitest)

| Target                | Type              | Purpose                                                                                         | Location                                               |
| :-------------------- | :---------------- | :---------------------------------------------------------------------------------------------- | :----------------------------------------------------- |
| **`global.fetch`**    | `vi.fn()`         | Mocks network requests to verify `FetchEffect` logic without real network IO.                   | `packages/platform-browser/src/stress/effects.test.ts` |
| **`global.Worker`**   | `vi.fn()`         | Mocks Web Workers to test `WorkerEffect` lifecycle (postMessage, terminate) and error handling. | `packages/platform-browser/src/stress/effects.test.ts` |
| **`AbortController`** | `vi.spyOn`        | Verifies that `fetch` cancellation logic triggers the abort signal correctly.                   | `packages/platform-browser/src/stress/effects.test.ts` |
| **`Dispatch`**        | `vi.fn()` / Array | Captures dispatched messages to assert that the correct sequence of events occurred.            | Various `*.test.ts` files                              |

### E2E Tests (Playwright)

| Target             | Type           | Purpose                                                                                               | Location                 |
| :----------------- | :------------- | :---------------------------------------------------------------------------------------------------- | :----------------------- |
| **Network Routes** | `page.route()` | Intercepts API requests (e.g. `/posts?q=fail`) to simulate server errors or specific data conditions. | `tests/e2e/demo.spec.ts` |
