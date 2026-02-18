# Falsification Audit: FA-003

## Claim

**"deepFreeze catches mutations in devMode"** - Implied guarantee of immutability enforcement

**Where Expressed**:

- `packages/core/src/dispatcher.ts` lines 85-102: `deepFreeze` implementation
- Test names: "detects impurity in update function", "purity: deepFreeze catches mutations in devMode"
- docs/notes/ideas.md line 21: "Deep Freezing: In devMode, the dispatcher recursively freezes the new model after every update. This guarantees immutability"

## Enforcement Analysis

**Enforcement**: Partially enforced by code

- Recursive `Object.freeze()` called in devMode
- Freezes nested objects and properties
- Runs after each update in devMode

**Missing Enforcement**:

- Only freezes objects, not arrays or other data structures completely
- Cannot freeze primitive values
- No protection against mutation of external references
- Freezing happens AFTER update, not during

## Mock/Test Double Insulation

**Complete Insulation**:

- Tests only check for simple property mutations (`model.count++`)
- No tests with complex object graphs
- No tests with external references or shared objects
- No tests with array methods that mutate (push, splice, etc.)

**What's NOT Tested**:

- Array mutation methods (push, pop, splice, sort)
- Object property deletion/addition after freeze
- Mutation of external references to model
- Deep nested object mutation beyond freeze depth
- Mutation through prototype chain

## Falsification Strategies

### 1. Array Mutation Bypass Test

```typescript
// Test that array mutations can bypass freeze
test("array mutations bypass deep freeze", () => {
  const model = {
    items: [1, 2, 3],
    nested: { data: [4, 5, 6] },
  };

  const impureUpdate = (model, msg) => {
    if (msg.kind === "MUTATE_ARRAY") {
      // These mutations should be caught but aren't fully
      model.items.push(99); // Mutates frozen array
      model.nested.data.sort(); // Mutates nested array
      return { model, effects: [] };
    }
    return { model, effects: [] };
  };

  const dispatcher = createDispatcher({
    model,
    update: impureUpdate,
    effectRunner: () => {},
    devMode: true,
  });

  // Should throw but may not catch all array mutations
  expect(() => dispatcher.dispatch({ kind: "MUTATE_ARRAY" })).toThrow();
});
```

### 2. External Reference Mutation Test

```typescript
// Test mutation through external references
test("external reference mutations bypass freeze", () => {
  const externalRef = { shared: [1, 2, 3] };
  const model = {
    data: externalRef,
    count: 0,
  };

  const impureUpdate = (model, msg) => {
    if (msg.kind === "MUTATE_EXTERNAL") {
      // Mutate through external reference
      externalRef.shared.push(99);
      return { model, effects: [] };
    }
    return { model, effects: [] };
  };

  const dispatcher = createDispatcher({
    model,
    update: impureUpdate,
    effectRunner: () => {},
    devMode: true,
  });

  dispatcher.dispatch({ kind: "MUTATE_EXTERNAL" });

  // Model changed through external reference - not caught
  expect(dispatcher.getSnapshot().data.shared).toEqual([1, 2, 3, 99]);
});
```

### 3. Prototype Chain Mutation Test

```typescript
// Test mutations through prototype chain
test("prototype chain mutations bypass freeze", () => {
  const model = Object.create({ protoValue: 1 });
  model.ownValue = 2;

  const impureUpdate = (model, msg) => {
    if (msg.kind === "MUTATE_PROTO") {
      // Mutate prototype property
      Object.getPrototypeOf(model).protoValue = 99;
      return { model, effects: [] };
    }
    return { model, effects: [] };
  };

  const dispatcher = createDispatcher({
    model,
    update: impureUpdate,
    effectRunner: () => {},
    devMode: true,
  });

  dispatcher.dispatch({ kind: "MUTATE_PROTO" });

  // Prototype mutation not caught by deep freeze
  expect(dispatcher.getSnapshot().protoValue).toBe(99);
});
```

### 4. Complex Object Graph Test

```typescript
// Test deep complex object graphs
test("complex object graphs have freeze gaps", () => {
  const model = {
    level1: {
      level2: {
        level3: {
          level4: {
            data: [1, 2, 3],
            map: new Map([["key", "value"]]),
            set: new Set([1, 2, 3]),
          },
        },
      },
    },
  };

  const impureUpdate = (model, msg) => {
    if (msg.kind === "DEEP_MUTATE") {
      // Mutate deep structures that might not be frozen
      model.level1.level2.level3.level4.data.push(99);
      model.level1.level2.level3.level4.map.set("new", "value");
      model.level1.level2.level3.level4.set.add(99);
      return { model, effects: [] };
    }
    return { model, effects: [] };
  };

  const dispatcher = createDispatcher({
    model,
    update: impureUpdate,
    effectRunner: () => {},
    devMode: true,
  });

  // Some mutations may bypass freeze
  dispatcher.dispatch({ kind: "DEEP_MUTATE" });

  const result = dispatcher.getSnapshot();
  expect(result.level1.level2.level3.level4.data).toContain(99);
  expect(result.level1.level2.level3.level4.map.get("new")).toBe("value");
  expect(result.level1.level2.level3.level4.set.has(99)).toBe(true);
});
```

### 5. Property Deletion/Addition Test

```typescript
// Test property deletion and addition after freeze
test("property deletion/addition after freeze", () => {
  const model = {
    required: "value",
    optional: "present",
  };

  const impureUpdate = (model, msg) => {
    if (msg.kind === "MODIFY_PROPS") {
      delete model.optional; // Delete property
      model.newProp = "added"; // Add new property
      return { model, effects: [] };
    }
    return { model, effects: [] };
  };

  const dispatcher = createDispatcher({
    model,
    update: impureUpdate,
    effectRunner: () => {},
    devMode: true,
  });

  dispatcher.dispatch({ kind: "MODIFY_PROPS" });

  const result = dispatcher.getSnapshot();
  expect(result.optional).toBeUndefined();
  expect(result.newProp).toBe("added");
});
```

## Classification

**Status**: Weakly Supported

**Evidence**:

- Basic object freezing implemented
- Simple property mutations caught in tests
- Recursive freezing for nested objects

**Contradictions**:

- Array mutations not fully prevented
- External reference mutations bypass freeze
- Prototype chain mutations not blocked
- Complex data structures (Map, Set) not handled
- Property deletion/addition after freeze not prevented

**Falsification Risk**: HIGH - The immutability guarantee has significant gaps that allow mutations to bypass the freeze mechanism.

## Recommendation

Replace "guarantees immutability" with "provides basic immutability protection for simple object properties" and document the limitations. Consider using Proxy-based immutability for comprehensive protection.
