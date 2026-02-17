# Client-Grade Failure Report

| Issue                                                                                          | Severity | Area     | Repro Reliability | First Observed      |
| :--------------------------------------------------------------------------------------------- | :------- | :------- | :---------------- | :------------------ |
| Missing `pnpm` and `corepack` in environment                                                   | Minor    | Tooling  | 100%              | Initial Setup       |
| Deprecated Vitest workspace config                                                             | Minor    | Tooling  | 100%              | `pnpm test`         |
| Multiple projects warning in ESLint                                                            | Minor    | Tooling  | 100%              | `pnpm lint`         |
| Fetch effect does not auto-cancel previous requests with same `abortKey`                       | Major    | Platform | 100%              | Effects Stress Test |
| Workers are single-use (terminated after one message), causing performance issues on high load | Major    | Platform | 100%              | Effects Stress Test |

## Detailed Issues

### 1. Missing `pnpm` and `corepack` in environment

**Severity:** Minor
**Area:** Tooling
**Description:** The environment explicitly claims `Node >= 20` and `pnpm` availability, but `pnpm` and `corepack` commands were missing. `package.json` requires `pnpm@10.30.0`.
**Reproduction:**

```bash
node -v # v25.4.0
pnpm -v # command not found
corepack -v # command not found
```

**Workaround:** Installed `pnpm` globally via `npm install -g pnpm`.

### 2. Deprecated Vitest workspace config

**Severity:** Minor
**Area:** Tooling
**Description:** `vitest.workspace.ts` triggers a deprecation warning.
**Logs:**

```
DEPRECATED  The workspace file is deprecated and will be removed in the next major. Please, use the `test.projects` field in the root config file instead.
```

### 3. Multiple projects warning in ESLint

**Severity:** Minor
**Area:** Tooling
**Description:** ESLint warns about multiple projects configuration.
**Logs:**

```
Multiple projects found, consider using a single `tsconfig` with `references` to speed up, or use `noWarnOnMultipleProjects` to suppress this warning
```

### 4. Fetch effect does not auto-cancel previous requests with same `abortKey`

**Severity:** Major
**Area:** Platform
**Description:**
When `BrowserRunner` processes a `fetch` effect with an `abortKey`, it overwrites the reference in its `controllers` map but does **not** abort the previous controller associated with that key.
This leads to "leakage" of network requests. If a user rapidly triggers fetches (e.g., type-ahead search), all requests will run to completion and dispatch messages, likely causing race conditions or wasted bandwidth.
**Reproduction:**
See `packages/platform-browser/src/stress/effects.test.ts`.
Trigger two fetches with same `abortKey`. Observe both continue running.

### 5. Workers are single-use (terminated after one message)

**Severity:** Major
**Area:** Platform
**Description:**
`BrowserRunner.runWorker` creates a `new Worker()` for every effect and calls `worker.terminate()` immediately after receiving the first message.
This makes "Worker" effects extremely expensive (high startup cost) and unsuitable for sustained background tasks or frequent offloading.
**Reproduction:**
See `packages/platform-browser/src/stress/effects.test.ts`.
Spamming 1000 worker effects creates 1000 worker threads.
