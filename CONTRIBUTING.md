# Contributing to Causaloop

## Feature Checklist

When adding a new feature, follow these steps to maintain architectural integrity:

1.  **Define Messages**: Add new message types to `Msg` union.
2.  **Extend Model**: Update `Model` type if internal state needs to change.
3.  **Extend Reducer**: Implement logic in the `update` function. Ensure it remains pure.
4.  **Define Effects**: If async operations are needed, define new `Effect` types and corresponding `Runners`.
5.  **Add Invariant Tests**: Write tests in `core` or `app` to ensure the new state transitions don't violate business rules.
6.  **Update Documentation**: If new architectural patterns are introduced, update `ARCHITECTURE.md`.

## Development Workflow

- `pnpm install`: Install dependencies.
- `pnpm dev`: Start development servers.
- `pnpm lint`: Run strict linting including boundary checks.
- `pnpm test`: Run tests with Vitest.
- `pnpm build`: Build all packages.

## Strict Linting

We enforce layer boundaries using `eslint-plugin-boundaries`. Violations will fail the build.
We also enforce exhaustive switch statements for messages to ensure all possible states are handled.
