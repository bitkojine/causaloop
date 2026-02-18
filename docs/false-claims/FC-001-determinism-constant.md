# Falsification Audit: FA-001

## Claim

**"DETERMINISM = TRUE"** - Expressed in dispatcher.ts constant and architectural documentation

**Where Expressed**: 
- `packages/core/src/dispatcher.ts` line 19: `DETERMINISM = TRUE`
- README.md line 33: "ensures that your business logic remains pure...and your bugs are 100% reproducible via time-travel replay"
- ARCHITECTURE.md line 3: "designed to be deterministic, race-condition resistant"

## Enforcement Analysis

**Enforcement**: Partially enforced by code
- FIFO queue processing prevents race conditions
- Message logging enables replay
- Time/random providers capture entropy

**Missing Enforcement**:
- No verification that update functions are pure
- No detection of side effects in update functions
- Replay only validates final state, not intermediate states
- Effects are not replayed (only messages are)

## Mock/Test Double Insulation

**Critical Reality Amputation**:
- Tests use `vi.useFakeTimers()` - removes real timer behavior
- Mock fetch/worker implementations remove network and concurrency failures
- No tests with real I/O errors, timeouts, or partial failures
- Stress tests use deterministic message patterns, not chaotic real-world inputs

**What's NOT Tested**:
- Network timeouts and connection drops
- Worker crashes and memory limits  
- Timer precision issues across browsers
- Concurrent access to shared resources
- Memory pressure during high throughput
- Browser event loop starvation

## Falsification Strategies

### 1. Property-Based Replay Testing
```typescript
// Generate chaotic message sequences with real timers
test("replay preserves state under random async timing", async () => {
  const realTimers = true;
  const chaosFactor = 0.1; // 10% random delays
  
  // Generate messages with unpredictable timing
  const log = await generateChaoticSession(chaosFactor, realTimers);
  
  // Replay should match exactly
  const replayed = replay({ initialModel, update, log });
  expect(replayed).toEqual(finalSnapshot);
});
```

### 2. Effect Falsification
```typescript
// Test that effects don't break determinism
test("effects are purely data, not execution", () => {
  let effectExecutionCount = 0;
  const effectRunner = (effect, dispatch) => {
    effectExecutionCount++;
    // Real network calls, timers, etc.
  };
  
  // Same message log should produce same effects regardless of execution
  const effects1 = extractEffects(log1);
  const effects2 = extractEffects(log1);
  expect(effects1).toEqual(effects2);
});
```

### 3. Concurrency Stress Testing
```typescript
// Real concurrent dispatch from multiple event sources
test("determinism under real concurrency", async () => {
  const sources = [
    networkEventSource(),
    timerEventSource(), 
    userEventSource(),
    workerMessageSource()
  ];
  
  // Run all sources concurrently with real timing
  await Promise.all(sources.map(s => s.start(dispatcher)));
  
  // Verify replay produces identical state
  const replayed = replay({ initialModel, update, log });
  expect(replayed).toEqual(finalSnapshot);
});
```

### 4. Memory Pressure Testing
```typescript
// Test determinism under memory constraints
test("replay preserves state under memory pressure", async () => {
  // Simulate memory pressure during replay
  const memoryLimitedReplay = withMemoryLimit(() => 
    replay({ initialModel, update, largeLog })
  );
  
  expect(memoryLimitedReplay).toEqual(normalReplay);
});
```

### 5. Real Network Failure Injection
```typescript
// Test with real network failures, not mocks
test("determinism despite real network failures", async () => {
  const flakyNetwork = new FlakyNetworkService({
    failureRate: 0.1,
    timeoutMs: 1000,
    retryStrategy: 'exponential-backoff'
  });
  
  // Run session with real network failures
  await runSessionWithNetwork(dispatcher, flakyNetwork);
  
  // Replay should be deterministic despite failures
  const replayed = replay({ initialModel, update, log });
  expect(replayed).toEqual(finalSnapshot);
});
```

## Classification

**Status**: Weakly Supported

**Evidence**: 
- FIFO processing prevents race conditions
- Message logging enables basic replay
- Time/random capture preserves some entropy

**Contradictions**:
- Effects are not replayed, breaking full determinism
- No enforcement of update function purity
- Tests insulated from real-world failures
- Phantom pending bug class documented in ideas.md

**Falsification Risk**: HIGH - The claim overstates what's actually guaranteed. Real-world concurrency, network failures, and memory pressure are not tested or protected against.

## Recommendation

Replace "DETERMINISM = TRUE" with "MESSAGE_ORDERING_DETERMINISM = TRUE" and document that effect execution and external I/O are not deterministic.
