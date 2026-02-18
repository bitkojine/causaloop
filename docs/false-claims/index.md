# False Claims Index

This index tracks all analyzed claims from the causaloop-repo documentation and codebase.

| ID     | Claim                                                   | Type                | Verdict             | Severity | Source          | Date       |
| ------ | ------------------------------------------------------- | ------------------- | ------------------- | -------- | --------------- | ---------- |
| FC-001 | "production-grade TypeScript ecosystem"                 | Operational         | Unproven            | Medium   | README.md:18    | 2025-02-18 |
| FC-002 | "bugs are 100% reproducible via time-travel replay"     | Behavioral          | False               | High     | README.md:33    | 2025-02-18 |
| FC-003 | "eliminating race conditions by design"                 | Reliability         | True                | Low      | README.md:39    | 2025-02-18 |
| FC-004 | "1,000+ concurrent timers with zero starvation"         | Performance         | Unproven            | Medium   | README.md:91    | 2025-02-18 |
| FC-005 | "Battle-Tested Reliability"                             | Reliability         | Unproven            | Medium   | README.md:86    | 2025-02-18 |
| FC-006 | Package status "Stable" for 0.1.0 versions              | Operational         | False               | High     | README.md:80-82 | 2025-02-18 |
| FC-007 | "eliminating stuck 'phantom pending' states"            | Reliability         | False               | High     | README.md:94    | 2025-02-18 |
| FC-008 | "strictly enforced by both local and remote guardrails" | Security/Compliance | Not Verifiable Here | Medium   | README.md:166   | 2025-02-18 |

## Summary

- **Total Claims Analyzed**: 8
- **False Claims**: 3 (37.5%)
- **True Claims**: 1 (12.5%)
- **Unproven Claims**: 3 (37.5%)
- **Not Verifiable Here**: 1 (12.5%)

## Severity Breakdown

- **High Severity** (Security/Reliability): 3 claims
- **Medium Severity** (Operational/Performance): 4 claims
- **Low Severity** (Verified True): 1 claim

## Most Critical Issues

1. **FC-002**: False claim about 100% reproducible bugs - contradicted by documented phantom pending bug
2. **FC-006**: False stability claims for 0.1.0 versions - violates semantic versioning
3. **FC-007**: False claim about eliminating phantom pending states - bug still exists

## Recommendations

1. Fix the phantom pending bug class (FC-002, FC-007)
2. Update package statuses to match version numbers (FC-006)
3. Provide benchmark evidence for performance claims (FC-004)
4. Add production deployment documentation (FC-001)
5. Define "Battle-Tested" criteria and evidence (FC-005)

## Fix Status

A claim is considered Fixed only when:

- Evidence now satisfies its proof criteria, OR
- It is replaced with a strictly weaker, explicit statement of limits

Deletion alone is not a fix.
