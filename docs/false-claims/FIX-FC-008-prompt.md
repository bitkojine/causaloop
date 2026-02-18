# Fix Request: Eliminate Phantom Pending Bug (FC-008)

## Mission

Fix the **critical phantom pending bug** in causaloop's session restore system. Currently, manual normalization is incomplete and error-prone, leaving subscriptions (timer, animation, stress) in "phantom" states where they appear active but aren't actually running.

## Problem Analysis

**Current Broken Implementation** (app-web/src/main.ts:177-198):

```typescript
// Manual normalization (INCOMPLETE)
if (restoredModel.worker.status === "computing") {
  restoredModel.worker.status = "idle";
}
if (restoredModel.load.status === "loading") {
  restoredModel.load.status = "idle";
}
if (restoredModel.search.status === "loading") {
  restoredModel.search.status = "idle";
}
// MISSING: timer, animation, stress subscriptions
```

**Root Cause**: Framework requires manual intervention for each feature's in-flight state. New features must remember to add normalization - error-prone and incomplete.

## Solution Requirements

Implement **framework-level subscription resumption** as designed in docs/notes/ideas.md:

### 1. Automatic Subscription Detection

- Dispatcher should automatically detect which subscriptions should be running based on model state
- No manual normalization required
- Subscriptions automatically resume after replay

### 2. Declarative Subscription Model

```typescript
const subscriptions = (model) => {
  return [
    model.timer.isRunning ? timerSub(model.timer.interval) : null,
    model.animation.isAnimating ? animationSub() : null,
    model.stress.isRunning ? stressSub(model.stress.intensity) : null,
    // Add new features here - automatically handled
  ].filter(Boolean);
};
```

### 3. Framework-Level Recovery

- Dispatcher automatically reconciles subscriptions after replay
- `reconcileSubscriptions()` called during session restore
- No phantom pending states possible

## Implementation Tasks

### Phase 1: Core Framework Changes

1. **Update Dispatcher** (packages/core/src/dispatcher.ts):
   - Ensure `reconcileSubscriptions()` is called after replay
   - Add automatic subscription resumption logic
2. **Enhance Replay Integration** (packages/core/src/replay.ts):
   - Support subscription-aware replay
   - Ensure replay triggers subscription reconciliation

### Phase 2: Application Layer Updates

1. **Remove Manual Normalization** (app-web/src/main.ts):
   - Delete lines 177-198 (manual normalization)
   - Replace with framework-level approach

2. **Update Subscription Functions**:
   - Ensure timer, animation, stress subscriptions are model-driven
   - Add subscription functions that return null when not active

### Phase 3: Validation

1. **Add Integration Tests**:
   - Test session restore with active timer
   - Test session restore with active animation
   - Test session restore with active stress test
   - Verify no phantom pending states

2. **Add Regression Protection**:
   - Test that new features automatically work with session restore
   - Verify no manual normalization needed

## Success Criteria

### Functional Requirements

- [ ] Timer subscriptions automatically resume after session restore
- [ ] Animation frame subscriptions automatically resume after session restore
- [ ] Stress test subscriptions automatically resume after session restore
- [ ] No manual normalization required in app code
- [ ] New features work automatically with session restore

### Non-Functional Requirements

- [ ] No performance regression in session restore
- [ ] No breaking changes to existing API
- [ ] Backward compatibility maintained
- [ ] Comprehensive test coverage for edge cases

### Quality Requirements

- [ ] All existing tests pass
- [ ] New integration tests added
- [ ] No phantom pending states in any scenario
- [ ] Session restore works reliably under all conditions

## Technical Constraints

### Must Not Break

- Existing dispatcher API
- Current subscription interface
- Replay functionality
- Message processing logic

### Must Maintain

- FIFO message processing
- Deterministic replay
- Performance characteristics
- Error handling behavior

## Implementation Guidance

### Key Files to Modify

1. `packages/core/src/dispatcher.ts` - Core dispatcher logic
2. `packages/core/src/replay.ts` - Replay integration
3. `app-web/src/main.ts` - Remove manual normalization
4. `app-web/src/app.ts` - Update subscription functions

### Design Patterns to Follow

- **Declarative Subscriptions**: Subscriptions expressed as data, not imperative code
- **Model-Driven**: Subscription state derived from model, not separate state
- **Automatic Recovery**: Framework handles recovery, not application code

### Testing Strategy

- **Property-Based Tests**: Random session states with various active subscriptions
- **Integration Tests**: Real browser session restore scenarios
- **Regression Tests**: Ensure no phantom states in any combination

## Verification Steps

1. **Manual Testing**:
   - Start timer, refresh page, verify timer resumes
   - Start animation, refresh page, verify animation resumes
   - Start stress test, refresh page, verify stress test resumes

2. **Automated Testing**:
   - Run all existing tests (ensure no regressions)
   - Run new integration tests
   - Run property-based tests for edge cases

3. **Code Review**:
   - Verify no manual normalization remains
   - Confirm framework handles all subscription types
   - Check for breaking changes

## Expected Outcome

After successful implementation:

- **Zero phantom pending states** in any scenario
- **Automatic session recovery** for all subscription types
- **No manual intervention** required for new features
- **Improved reliability** of session restore functionality
- **Simplified maintenance** for developers

## Risk Mitigation

### High-Risk Areas

- **Dispatcher Logic**: Core message processing - test thoroughly
- **Session Restore**: Critical user functionality - verify extensively
- **Subscription Lifecycle**: Could break existing features - ensure compatibility

### Mitigation Strategies

- **Incremental Implementation**: Phase 1 (core) → Phase 2 (app) → Phase 3 (validation)
- **Comprehensive Testing**: Unit, integration, and property-based tests
- **Backward Compatibility**: Maintain existing API surface
- **Rollback Plan**: Keep manual normalization as fallback during development

## Success Metrics

- **Bug Elimination**: 0 phantom pending states in all test scenarios
- **Code Simplicity**: Remove 20+ lines of manual normalization
- **Developer Experience**: New features work automatically with session restore
- **Test Coverage**: 100% coverage for session restore scenarios

This fix addresses the most critical false claim (FC-008) and eliminates a fundamental architectural flaw in the causaloop system.
