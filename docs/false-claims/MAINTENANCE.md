# False Claims Documentation Maintenance Guide

This guide explains how to maintain the false claims documentation system for the causaloop-repo.

## Overview

The false claims system uses a **falsification-oriented methodology** to identify and document overstated or unsupported claims in the codebase. Each claim is treated as a hypothesis that may be false, with concrete strategies provided to falsify it.

## Documentation Structure

```
docs/false-claims/
├── index.md              # Master index with summary statistics
├── FC-XXX-claim-name.md  # Individual claim analyses
└── MAINTENANCE.md        # This maintenance guide
```

## Claim Analysis Template

Each claim analysis follows this structure:

```markdown
# False Claim Analysis: FC-XXX

## Claim
**Source**: [file:line] or location
**Full Context**: Exact claim text
**Type**: [Behavioral|Reliability|Security/Compliance|Performance|Operational]

## Verdict
**Status**: [True|False|Unproven|Not Verifiable Here]

## Proof Criteria
- Evidence requirements for this claim type
- Specific tests or documentation needed

## Evidence Analysis
### Found Evidence
- What supports the claim
### Missing Evidence
- What would falsify the claim
### Contradictory Evidence
- What directly opposes the claim

## Conclusion
Summary of why the claim has this verdict

## Recommendation
How to fix or improve the claim
```

## Maintenance Process

### 1. Adding New Claims

**When to Add:**
- New features make strong assertions
- Function names imply guarantees (Safe, Atomic, Reliable)
- Comments claim behavior
- Test assertions imply system correctness
- Architectural assumptions are encoded

**Process:**
1. Assign next FC number (check index.md for highest)
2. Create descriptive filename: `FC-XXX-claim-name.md`
3. Follow the analysis template
4. Include falsification strategies
5. Update index.md statistics

### 2. Updating Existing Claims

**When to Update:**
- Code changes affect claim validity
- New evidence emerges
- Tests are added/removed
- Claims are fixed or weakened

**Process:**
1. Review claim against current codebase
2. Update evidence analysis
3. Modify verdict if needed
4. Add new falsification strategies
5. Update index.md if classification changes

### 3. Removing Claims

**When to Remove:**
- Claim is fixed and no longer false
- Claim is removed from codebase
- Claim is replaced with accurate statement

**Process:**
1. Verify claim is truly resolved
2. Document fix in claim analysis
3. Mark as "Fixed" with evidence
4. Keep in index.md for historical tracking
5. Consider archiving instead of deleting

## Classification Guidelines

### Likely True
- Strong code enforcement
- Comprehensive adversarial testing
- No known bypasses
- Evidence withstands falsification attempts

### Weakly Supported
- Basic enforcement exists
- Some testing present
- Known limitations or bypasses
- Insufficient adversarial testing

### Unverified
- No evidence found
- No tests for the claim
- Cannot be verified from available information
- Requires external validation

### Probably False
- Strong evidence against claim
- Known contradictions
- Fundamental design flaws
- Mock insulation hides reality

### Demonstrably False
- Direct evidence of falsity
- Reproducible counterexamples
- Test failures proving claim false
- Documentation contradictions

## Falsification Strategy Requirements

Each claim MUST include concrete falsification strategies:

### Static Analysis
- Code pattern searches
- Type checking
- Dependency analysis
- Architectural violation detection

### Property-Based Testing
- Random input generation
- Edge case exploration
- Invariant checking
- Chaos engineering

### Integration Testing
- Real dependencies (not mocks)
- Network I/O testing
- Resource constraint testing
- Concurrency stress testing

### Fault Injection
- Network failures
- Memory pressure
- Timer precision issues
- Worker thread crashes

## Quality Standards

### Evidence Requirements
- **Specific**: Reference exact files, lines, tests
- **Verifiable**: Others can reproduce the analysis
- **Comprehensive**: Cover both supporting and contradicting evidence
- **Current**: Reflect latest codebase state

### Falsification Requirements
- **Actionable**: Provide concrete test code
- **Realistic**: Test actual failure modes
- **Comprehensive**: Cover multiple attack vectors
- **Reproducible**: Others can run the falsification tests

### Documentation Standards
- **Clear**: Unambiguous language
- **Concise**: No unnecessary verbosity
- **Consistent**: Follow template exactly
- **Maintained**: Keep up-to-date with codebase

## Review Process

### Self-Review Checklist
- [ ] Claim clearly stated with source
- [ ] Classification justified with evidence
- [ ] Falsification strategies are concrete
- [ ] Template followed correctly
- [ ] Index.md updated

### Peer Review Triggers
- High-risk claims (CRITICAL/HIGH severity)
- Complex architectural assumptions
- Claims affecting multiple components
- Controversial classifications

## Automation Opportunities

### Static Checks
- Scan for claim-like patterns in code
- Identify function names with guarantees
- Flag comments making assertions
- Detect test assumptions

### Continuous Updates
- Monitor code changes for new claims
- Update existing claims when code changes
- Run falsification tests automatically
- Generate updated statistics

## Integration with Development Workflow

### Pre-Commit
- Check for new claim-like patterns
- Validate claim documentation updates
- Run relevant falsification tests

### Code Review
- Review new claims for accuracy
- Ensure falsification strategies are included
- Verify classification is appropriate

### Release
- Update claim status for released features
- Ensure all new claims are documented
- Review claim statistics for release notes

## Metrics and Tracking

### Claim Statistics
- Total claims analyzed
- Distribution by classification
- Risk level breakdown
- Claim resolution rate

### Quality Metrics
- Claims with falsification tests
- Claims verified by integration tests
- Claims fixed over time
- Documentation completeness

## Common Pitfalls to Avoid

### Analysis Pitfalls
- **Assuming claims are true** without evidence
- **Accepting mock-based tests** as proof
- **Ignoring contradictory evidence**
- **Overlooking edge cases**

### Documentation Pitfalls
- **Vague claim statements**
- **Missing falsification strategies**
- **Outdated evidence references**
- **Inconsistent classifications**

### Process Pitfalls
- **Documenting obvious truths** (waste of time)
- **Ignoring architectural assumptions**
- **Forgetting to update index.md**
- **Neglecting existing claim updates**

## Escalation Criteria

### When to Escalate
- Critical security claims found false
- Architecture-level contradictions discovered
- Multiple high-risk claims in same component
- Claims affecting production reliability

### Escalation Process
1. Flag claim in documentation
2. Notify architecture team
3. Propose immediate mitigation
4. Schedule fix for next release
5. Track resolution in claim analysis

## Conclusion

The false claims documentation system is a living tool for maintaining intellectual honesty in the codebase. By treating every claim as falsifiable and providing concrete strategies to test them, we ensure the system doesn't lie to itself or its users.

Regular maintenance and updates keep the documentation relevant and useful for ongoing development and architectural decision-making.
