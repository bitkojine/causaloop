# Falsification Audit: FA-005

## Claim

**"Torture Test: Replays complex async session identically"** - Implied guarantee of comprehensive replay testing

**Where Expressed**: 
- `packages/core/src/stress/replay.test.ts` line 75: test name and description
- Test claims to validate "complex async session" replay
- 50 iterations with random message selection

## Enforcement Analysis

**Enforcement**: Not enforced by test
- Only uses `setTimeout` with fixed delays
- Mock async behavior, not real async operations
- No real network I/O or worker threads
- No memory pressure or resource constraints

**Code Evidence**:
```typescript
it("Torture Test: Replays complex async session identically", async () => {
  const ITERATIONS = 50;
  for (let i = 0; i < ITERATIONS; i++) {
    const rand = Math.random();
    if (rand < 0.3) {
      dispatcher.dispatch({ kind: "INC" });
    } else if (rand < 0.6) {
      dispatcher.dispatch({ kind: "ASYNC_INC" });
    } else {
      dispatcher.dispatch({ kind: "ADD_RANDOM", val: rand });
    }
    if (i % 10 === 0) await new Promise((r) => setTimeout(r, 5));
  }
  await new Promise((r) => setTimeout(r, 200));
  // Compare final state only
});
```

## Mock/Test Double Insulation

**Complete Insulation**:
- Uses `setTimeout` instead of real async operations
- No network calls, file I/O, or worker threads
- No memory constraints or resource limits
- Fixed timing patterns, not chaotic real-world timing
- No concurrent async operations

**What's NOT Tested**:
- Real network timeouts and failures
- Worker thread crashes and memory limits
- Concurrent async operations
- Memory pressure during replay
- Browser event loop interference
- Timer precision variations
- Async stack overflow conditions

## Falsification Strategies

### 1. Real Network Async Test
```typescript
// Test replay with real network operations
test("replay with real network async operations", async () => {
  const realNetwork = new NetworkService();
  const networkUpdate = async (model, msg) => {
    if (msg.kind === "FETCH") {
      try {
        const data = await realNetwork.fetch(msg.url);
        return { model: { ...model, data }, effects: [] };
      } catch (error) {
        return { model: { ...model, error }, effects: [] };
      }
    }
    return { model, effects: [] };
  };
  
  // Run session with real network calls
  await runNetworkSession(dispatcher, realNetwork);
  
  // Replay should handle network timing differences
  const replayed = replay({ initialModel, update: networkUpdate, log });
  expect(replayed).toEqual(finalSnapshot);
});
```

### 2. Concurrent Async Operations Test
```typescript
// Test replay with truly concurrent async operations
test("replay with concurrent async operations", async () => {
  const concurrentUpdate = (model, msg) => {
    if (msg.kind === "CONCURRENT_FETCH") {
      const effects = msg.urls.map(url => ({
        kind: "FETCH",
        url,
        id: Math.random()
      }));
      return { model, effects };
    }
    return { model, effects: [] };
  };
  
  const effectRunner = async (effect, dispatch) => {
    // Real concurrent fetches
    const results = await Promise.all(
      effect.urls.map(url => realFetch(url))
    );
    dispatch({ kind: "RESULTS", data: results });
  };
  
  // Dispatch concurrent operations
  dispatcher.dispatch({ 
    kind: "CONCURRENT_FETCH", 
    urls: [url1, url2, url3, url4, url5] 
  });
  
  await waitForAllEffects();
  
  // Replay should preserve concurrent behavior
  const replayed = replay({ initialModel, update: concurrentUpdate, log });
  expect(replayed).toEqual(finalSnapshot);
});
```

### 3. Memory Pressure During Replay Test
```typescript
// Test replay under memory constraints
test("replay under memory pressure", async () => {
  const memoryHogUpdate = (model, msg) => {
    if (msg.kind === "ALLOCATE") {
      const largeData = new Array(1000000).fill(0).map(() => ({
        random: Math.random(),
        nested: new Array(1000).fill(Math.random())
      }));
      return { model: { ...model, largeData }, effects: [] };
    }
    return { model, effects: [] };
  };
  
  // Generate session with memory allocations
  for (let i = 0; i < 100; i++) {
    dispatcher.dispatch({ kind: "ALLOCATE" });
  }
  
  // Replay under memory pressure
  const memoryLimitedReplay = withMemoryLimit(() => 
    replay({ initialModel, update: memoryHogUpdate, log })
  );
  
  expect(memoryLimitedReplay).toEqual(finalSnapshot);
});
```

### 4. Timer Precision Test
```typescript
// Test replay with timer precision variations
test("replay with timer precision variations", async () => {
  const timerUpdate = (model, msg) => {
    if (msg.kind === "TIMER_START") {
      return {
        model,
        effects: [{
          kind: "TIMER",
          delay: msg.delay,
          precision: 'high'
        }]
      };
    }
    return { model, effects: [] };
  };
  
  const effectRunner = (effect, dispatch) => {
    if (effect.kind === "TIMER") {
      // Use real timers with precision variations
      const actualDelay = effect.delay + (Math.random() - 0.5) * 10;
      setTimeout(() => dispatch({ kind: "TIMER_DONE" }), actualDelay);
    }
  };
  
  // Run session with precision variations
  await runTimerSession(dispatcher);
  
  // Replay should handle timing differences
  const replayed = replay({ initialModel, update: timerUpdate, log });
  expect(replayed).toEqual(finalSnapshot);
});
```

### 5. Worker Thread Crash Test
```typescript
// Test replay with worker thread failures
test("replay with worker thread crashes", async () => {
  const workerUpdate = (model, msg) => {
    if (msg.kind === "HEAVY_COMPUTE") {
      return {
        model,
        effects: [{
          kind: "WORKER",
          task: msg.task,
          crashProbability: 0.1
        }]
      };
    }
    return { model, effects: [] };
  };
  
  const effectRunner = (effect, dispatch) => {
    if (effect.kind === "WORKER") {
      const worker = new Worker('compute-worker.js');
      
      worker.onmessage = (e) => {
        dispatch({ kind: "WORKER_RESULT", data: e.data });
      };
      
      worker.onerror = (error) => {
        dispatch({ kind: "WORKER_ERROR", error });
      };
      
      // Simulate random crashes
      if (Math.random() < effect.crashProbability) {
        worker.terminate();
        setTimeout(() => dispatch({ kind: "WORKER_CRASHED" }), 10);
      }
      
      worker.postMessage(effect.task);
    }
  };
  
  // Run session with potential worker crashes
  await runWorkerSession(dispatcher);
  
  // Replay should handle crash differences
  const replayed = replay({ initialModel, update: workerUpdate, log });
  expect(replayed).toEqual(finalSnapshot);
});
```

### 6. Event Loop Interference Test
```typescript
// Test replay with event loop interference
test("replay with event loop interference", async () => {
  const blockingUpdate = (model, msg) => {
    if (msg.kind === "BLOCKING_TASK") {
      // Simulate blocking operation
      const start = Date.now();
      while (Date.now() - start < 50) {} // Block for 50ms
      return { model: { ...model, blocked: true }, effects: [] };
    }
    return { model, effects: [] };
  };
  
  // Interfere with event loop during session
  const eventLoopInterference = setInterval(() => {
    // Add event loop pressure
    const start = Date.now();
    while (Date.now() - start < 10) {}
  }, 5);
  
  try {
    await runBlockingSession(dispatcher);
  } finally {
    clearInterval(eventLoopInterference);
  }
  
  // Replay should be immune to event loop interference
  const replayed = replay({ initialModel, update: blockingUpdate, log });
  expect(replayed).toEqual(finalSnapshot);
});
```

## Classification

**Status**: Weakly Supported

**Evidence**: 
- Test exists with multiple iterations
- Random message selection
- Some async behavior with setTimeout

**Critical Flaws**:
- No real async operations (network, workers, file I/O)
- No resource constraints or memory pressure
- Fixed timing patterns, not real-world chaos
- No concurrent async operations
- No failure scenarios

**Falsification Risk**: HIGH - The "torture test" name implies comprehensive stress testing but only provides basic async simulation. Real-world async complexity is completely absent.

## Recommendation

Rename to "Basic Async Replay Test" and implement real torture tests with network I/O, worker threads, memory pressure, and concurrent operations.
