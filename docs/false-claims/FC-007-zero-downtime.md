# False Claim Analysis: FC-007

## Claim

**Source**: README.md, Line 94
**Full Context**: "Session Restore: Subscriptions automatically resume after replay, eliminating stuck 'phantom pending' states."

**Type**: Reliability

## Verdict

**Status**: False

## Proof Criteria (Reliability)

- Invariant in code showing automatic subscription resumption
- Failure test demonstrating phantom pending elimination
- Evidence that the bug class is fully resolved

## Evidence Analysis

### Contradictory Evidence

- docs/notes/ideas.md Lines 32-56: Detailed documentation of "phantom pending" bug class
- Line 34: "After restore/replay, the model says 'I'm waiting for a response' but nothing is actually running. The UI is permanently stuck."
- Line 40: "Manual model normalization in main.ts after replay() — resetting each feature's in-flight state to idle. This is error-prone"
- Lines 42-56: Proposed framework-level fix using subscriptions, indicating current implementation is incomplete

### Found Evidence

- Subscription system exists in the framework
- Some automatic resumption capabilities are implemented

## Conclusion

The claim that phantom pending states are "eliminated" is false. The documentation explicitly acknowledges this as an ongoing issue requiring manual workarounds. The subscription system is proposed as a solution but not fully implemented to solve this problem.

## Recommendation

Replace with accurate statement like "Session Restore: Subscriptions provide framework-level support for resumption, though some edge cases require manual normalization."

## Evidence Paths

- `docs/notes/ideas.md` - Detailed documentation of phantom pending bug
- `packages/core/src/` - Subscription implementation (partial solution)
