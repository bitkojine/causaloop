# Immutable Bulk Operations: The O(n²) Spread Trap

## Problem

Dispatching N individual messages that each modify the same N-sized collection is always O(n²) with immutable state — regardless of data structure.

## Discovery

In [causal-factory](https://github.com/bitkojine/causal-factory), the "Event Storm" button resets all bots to idle. The naive approach dispatched one `reset_bot` message per bot:

```
window.triggerMarketCrash = () => {
    for (const bot of Object.values(latestSnapshot.bots)) {
        dispatcher.dispatch({ kind: 'reset_bot', botId: bot.id });
    }
};
```

### Array-based bots (`Bot[]`)

Each `reset_bot` did `.map()` over the entire array to find and replace one bot:

```
bots: model.bots.map(b => b.id === msg.botId ? { ...b, state: idle } : b)
```

With 30k bots: 30k messages × 30k iterations = **~900M operations**. Browser froze.

### Record-based bots (`Record<string, Bot>`)

Converted to Record for O(1) lookup:

```
bots: { ...model.bots, [msg.botId]: { ...model.bots[msg.botId], state: idle } }
```

Lookup is now O(1), but `...model.bots` still **copies all 30k entries** to create the new immutable object. With 30k messages: 30k × 30k copies = **~900M copy operations**. Browser still froze.

### Why this is fundamental

Each message in the dispatcher queue produces a new model. The next message operates on that new model. There is no way to "batch" mutations across messages without breaking the sequential guarantee of MVU.

```
Message 1: spread 30k entries → new model
Message 2: spread 30k entries from new model → new model
...
Message 30k: spread 30k entries → new model
```

This is inherent to immutable state management. The bottleneck isn't the lookup — it's the spread.

## Solution: Bulk messages

The correct pattern is a single message that handles the entire operation in one pass:

```
case 'market_crash': {
    const resetBots: Record<string, Bot> = {};
    for (const id in model.bots) {
        resetBots[id] = { ...model.bots[id], state: { kind: 'idle' } };
    }
    return { model: { ...model, bots: resetBots }, effects: [] };
}
```

One spread of the collection, one pass over all entities = O(n). With 41,700 bots this runs smoothly at ~45 FPS.

## Key takeaway

**Individual messages are for individual operations.** When you need to touch every entity, use a bulk message. The dispatcher's sequential guarantee is a strength for correctness, but it means each message pays the full cost of immutable state creation. Design messages accordingly.

## When individual entity messages ARE appropriate

The `reset_bot` message type still exists and works well for targeted operations — resetting a single bot in response to a user click, for example. The O(1) Record lookup makes this fast. The problem only arises when dispatching thousands of them in a tight loop.

## Related

- `Record<string, Bot>` is still the better data structure (consistent with `machines`, O(1) individual access)
- Persistent data structures (HAMTs) could theoretically solve this with O(log n) updates, but add complexity
- Elm has the same constraint — bulk operations are the standard pattern there too
