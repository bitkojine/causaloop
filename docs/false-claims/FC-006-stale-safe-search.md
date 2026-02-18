# False Claim Analysis: FC-006

## Claim
**Source**: app-web/src/features/search/search.ts, Line 114
**Full Context**: "Feature A: Stale-Safe Search"

**Type**: Reliability

## Verdict
**Status**: Weakly Supported

## Proof Criteria (Reliability)
- Invariant in code showing stale response prevention
- Failure test demonstrating race condition handling
- Evidence that abortKey prevents stale responses

## Evidence Analysis

### Found Evidence
- Line 50: `abortKey: "search"` - abort controller key for cancellation
- Lines 73-74: Request ID validation - ignores responses with old IDs
- Lines 85-86: Same validation for error responses
- BrowserRunner implements "takeLatest" strategy via abortKey

### Missing Evidence
- No tests for rapid search query changes
- No tests for slow network responses
- No tests for concurrent search requests
- No tests for abortKey edge cases

### Contradictory Evidence
- Race condition protection relies on manual requestId checking
- AbortKey behavior not tested in integration
- No validation that stale responses are actually discarded

## Falsification Strategies

### 1. Rapid Search Changes Test
```typescript
test("stale-safe search with rapid query changes", async () => {
  const slowNetwork = new SlowNetwork({ delayMs: 1000 });
  const renderer = createSearchRenderer(slowNetwork);
  
  // Type search queries rapidly
  renderer.input("a");
  await delay(10);
  renderer.input("ab");
  await delay(10);
  renderer.input("abc");
  
  // Wait for all responses
  await delay(2000);
  
  // Should only show results for "abc", not stale "a" or "ab" results
  expect(renderer.getResults()).toBe("abc results");
  expect(renderer.getStatus()).toBe("success");
});
```

### 2. Concurrent Request Race Test
```typescript
test("concurrent search requests don't overwrite results", async () => {
  const unpredictableNetwork = new UnpredictableNetwork({
    responseTimeRange: [50, 500]
  });
  
  const renderer = createSearchRenderer(unpredictableNetwork);
  
  // Send multiple requests simultaneously
  renderer.input("query1");
  renderer.input("query2");
  renderer.input("query3");
  
  await delay(1000);
  
  // Results should match the last request, not random order
  expect(renderer.getResults()).toBe("query3 results");
});
```

### 3. AbortKey Failure Test
```typescript
test("abortKey failure causes stale responses", async () => {
  const faultyRunner = new BrowserRunner({
    createAbortController: () => {
      // Return faulty controller that doesn't abort
      return new FaultyAbortController();
    }
  });
  
  const dispatcher = createSearchDispatcher(faultyRunner);
  
  dispatcher.dispatch({ kind: "search_changed", query: "first" });
  await delay(10);
  dispatcher.dispatch({ kind: "search_changed", query: "second" });
  
  await delay(1000);
  
  // Faulty abort controller might allow stale responses
  const results = dispatcher.getSnapshot().search.results;
  expect(results).not.toBe("first results"); // This might fail
});
```

### 4. Network Timeout Test
```typescript
test("network timeouts don't cause stale state", async () => {
  const timeoutNetwork = new TimeoutNetwork({ timeoutMs: 100 });
  const renderer = createSearchRenderer(timeoutNetwork);
  
  renderer.input("normal_query");
  await delay(50);
  renderer.input("timeout_query"); // This will timeout
  
  await delay(200);
  
  // Should recover from timeout, not show stale results
  expect(renderer.getStatus()).toBe("error");
  expect(renderer.getResults()).toBe("No results found.");
});
```

### 5. Memory Leak Test
```typescript
test("rapid search changes don't cause memory leaks", async () => {
  const renderer = createSearchRenderer();
  const initialMemory = getMemoryUsage();
  
  // Rapid search changes
  for (let i = 0; i < 1000; i++) {
    renderer.input(`query_${i}`);
    await delay(1);
  }
  
  await delay(5000); // Wait for all requests to settle
  
  const finalMemory = getMemoryUsage();
  const memoryIncrease = finalMemory - initialMemory;
  
  // Should not leak memory from aborted requests
  expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB limit
});
```

## Classification

**Status**: Weakly Supported

**Evidence**: 
- Basic requestId validation implemented
- AbortKey mechanism exists in BrowserRunner
- Manual stale response prevention in update logic

**Critical Flaws**:
- No integration tests for race conditions
- AbortKey behavior not verified in real scenarios
- Relies on developer diligence for requestId checks
- No tests for network failure scenarios

**Falsification Risk**: MEDIUM - The "stale-safe" claim has basic implementation but lacks comprehensive testing of real-world race conditions and network failures.

## Recommendation

Add integration tests that simulate real network timing variations and rapid user input. Consider making the stale-safe pattern more automatic rather than requiring manual requestId checking.
