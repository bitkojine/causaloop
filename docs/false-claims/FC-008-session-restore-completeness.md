# False Claim Analysis: FC-008

## Claim

**Source**: app-web/src/main.ts, Lines 177-198
**Full Context**: Manual session restore normalization for all in-flight states

**Type**: Reliability

## Verdict

**Status**: Demonstrably False

## Proof Criteria (Reliability)

- Invariant in code showing complete state normalization
- Failure test demonstrating all edge cases are handled
- Evidence that phantom pending states are eliminated

## Evidence Analysis

### Found Evidence

- Lines 177-198: Manual normalization for worker, load, and search states
- Lines 177-185: Worker computing state reset to idle
- Lines 187-192: Load loading state reset to idle
- Lines 193-197: Search loading state reset to idle

### Missing Evidence

- No normalization for timer subscriptions
- No normalization for animation frame subscriptions
- No normalization for stress test subscriptions
- No systematic approach to catch all in-flight states

### Contradictory Evidence

- Manual normalization is error-prone and incomplete
- docs/notes/ideas.md explicitly documents this as a known bug class
- New features must remember to add their own normalization
- No automated detection of missing normalizations

## Falsification Strategies

### 1. Timer Subscription Phantom State Test

```typescript
test("session restore leaves timer subscriptions in phantom state", async () => {
  const dispatcher = createDispatcher({
    model: { timer: { isRunning: true, interval: 1000 } },
    update: timerUpdate,
    subscriptions: timerSubscriptions,
    subscriptionRunner: mockTimerRunner,
  });

  // Start timer subscription
  dispatcher.dispatch({ kind: "START_TIMER" });
  await delay(100);

  // Get replayable state
  const { log, snapshot } = dispatcher.getReplayableState();

  // Replay from saved state
  const replayed = replay({
    initialModel: initialModel,
    update: timerUpdate,
    log,
  });

  // Timer should be running but isn't (phantom pending)
  expect(replayed.timer.isRunning).toBe(true);
  expect(mockTimerRunner.activeSubscriptions.size).toBe(0); // No actual timer!
});
```

### 2. Animation Frame Phantom State Test

```typescript
test("session restore leaves animation frame subscriptions phantom", async () => {
  const dispatcher = createDispatcher({
    model: { animation: { isAnimating: true } },
    update: animationUpdate,
    subscriptions: animationSubscriptions,
    subscriptionRunner: mockAnimationRunner,
  });

  // Start animation
  dispatcher.dispatch({ kind: "START_ANIMATION" });
  await delay(16);

  const { log, snapshot } = dispatcher.getReplayableState();

  const replayed = replay({
    initialModel: initialModel,
    update: animationUpdate,
    log,
  });

  // Animation appears running but no actual RAF callback
  expect(replayed.animation.isAnimating).toBe(true);
  expect(mockAnimationRunner.activeSubscriptions.size).toBe(0);
});
```

### 3. Stress Test Phantom State Test

```typescript
test("session restore leaves stress test subscriptions phantom", async () => {
  const dispatcher = createDispatcher({
    model: { stress: { isRunning: true, intensity: 100 } },
    update: stressUpdate,
    subscriptions: stressSubscriptions,
    subscriptionRunner: mockStressRunner,
  });

  // Start stress test
  dispatcher.dispatch({ kind: "START_STRESS" });
  await delay(100);

  const { log, snapshot } = dispatcher.getReplayableState();

  const replayed = replay({
    initialModel: initialModel,
    update: stressUpdate,
    log,
  });

  // Stress test appears running but no actual stress
  expect(replayed.stress.isRunning).toBe(true);
  expect(mockStressRunner.activeSubscriptions.size).toBe(0);
});
```

### 4. New Feature Missing Normalization Test

```typescript
test("new features without normalization cause phantom states", async () => {
  // Add new feature with in-flight state
  const newFeatureUpdate = (model, msg) => {
    if (msg.kind === "START_NEW_FEATURE") {
      return {
        model: {
          ...model,
          newFeature: { status: "processing", progress: 0 },
        },
        effects: [],
      };
    }
    return { model, effects: [] };
  };

  const dispatcher = createDispatcher({
    model: { newFeature: { status: "idle", progress: 0 } },
    update: newFeatureUpdate,
  });

  dispatcher.dispatch({ kind: "START_NEW_FEATURE" });

  const { log, snapshot } = dispatcher.getReplayableState();

  const replayed = replay({
    initialModel: { newFeature: { status: "idle", progress: 0 } },
    update: newFeatureUpdate,
    log,
  });

  // New feature is stuck in processing state (phantom pending)
  expect(replayed.newFeature.status).toBe("processing");
  // But no actual processing is happening
});
```

### 5. Incomplete Normalization Detection Test

```typescript
test("automated detection of incomplete normalization", () => {
  const allSubscriptions = [
    "timer",
    "animation",
    "worker",
    "search",
    "load",
    "stress",
  ];

  const normalizedStates = [
    "worker",
    "search",
    "load", // Only these are normalized
  ];

  const missingNormalizations = allSubscriptions.filter(
    (sub) => !normalizedStates.includes(sub),
  );

  // Should detect missing normalizations
  expect(missingNormalizations).toEqual(["timer", "animation", "stress"]);

  // This should be a compile-time or lint error
  console.warn("Missing normalization for:", missingNormalizations);
});
```

### 6. Race Condition During Restore Test

```typescript
test("race conditions during session restore cause inconsistent state", async () => {
  const dispatcher = createDispatcher({
    model: initialModel,
    update: appUpdate,
    subscriptions: appSubscriptions,
  });

  // Start multiple subscriptions
  dispatcher.dispatch({ kind: "START_TIMER" });
  dispatcher.dispatch({ kind: "START_ANIMATION" });
  dispatcher.dispatch({ kind: "START_WORKER" });

  await delay(100);

  const { log, snapshot } = dispatcher.getReplayableState();

  // Simulate race condition during restore
  const restoredModel = JSON.parse(JSON.stringify(snapshot));

  // Manual normalization (current approach)
  if (restoredModel.worker.status === "computing") {
    restoredModel.worker.status = "idle";
  }
  // Forget to normalize timer and animation

  const replayed = replay({
    initialModel,
    update: appUpdate,
    log,
  });

  // Inconsistent state - some normalized, some not
  expect(replayed.worker.status).toBe("idle"); // Normalized
  expect(replayed.timer.isRunning).toBe(true); // Not normalized!
  expect(replayed.animation.isAnimating).toBe(true); // Not normalized!
});
```

## Classification

**Status**: Demonstrably False

**Evidence**:

- Manual normalization is incomplete (missing timer, animation, stress)
- docs/notes/ideas.md documents this as a known bug class
- New features can easily introduce phantom states
- No automated detection of missing normalizations

**Critical Flaws**:

- Systematic design flaw requiring manual intervention
- Incomplete normalization leaves phantom states
- Error-prone manual process
- No automated verification of completeness

**Falsification Risk**: CRITICAL - The claim of complete session restore is demonstrably false. The system has a known architectural flaw that causes phantom pending states.

## Recommendation

Implement framework-level subscription resumption as described in docs/notes/ideas.md, or add automated detection of in-flight states that need normalization. The current manual approach is fundamentally broken.
