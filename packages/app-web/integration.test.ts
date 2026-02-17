import { describe, it, expect } from 'vitest';
import { initialModel, update, AppMsg } from './src/app.js';
import { replay, MsgLogEntry } from '@causaloop/core';

describe('Causaloop Integration', () => {
    it('Search: should ignore stale responses', () => {
        // Stage 1: Change search to "A" (requestId 1)
        let state = update(initialModel, { kind: 'search', msg: { kind: 'search_changed', query: 'A' } });
        expect(state.model.search.lastRequestId).toBe(1);
        expect(state.model.search.status).toBe('loading');

        // Stage 2: Change search to "B" (requestId 2)
        state = update(state.model, { kind: 'search', msg: { kind: 'search_changed', query: 'B' } });
        expect(state.model.search.lastRequestId).toBe(2);

        // Stage 3: RequestId 1 returns (stale)
        state = update(state.model, { kind: 'search', msg: { kind: 'search_succeeded', results: [{ title: 'A_result' }], requestId: 1 } });
        expect(state.model.search.status).toBe('loading'); // Still loading because 1 was ignored
        expect(state.model.search.results).toEqual([]);

        // Stage 4: RequestId 2 returns
        state = update(state.model, { kind: 'search', msg: { kind: 'search_succeeded', results: [{ title: 'B_result' }], requestId: 2 } });
        expect(state.model.search.status).toBe('success');
        expect(state.model.search.results).toEqual([{ title: 'B_result' }]);
    });

    it('Cancellation: should handle load and cancel', () => {
        // Stage 1: Request load
        let state = update(initialModel, { kind: 'load', msg: { kind: 'load_requested' } });
        expect(state.model.load.status).toBe('loading');
        expect(state.effects.find((e) => (e as any).original?.kind === 'fetch' && (e as any).original?.abortKey === 'bigload')).toBeDefined();

        // Stage 2: Cancel
        state = update(state.model, { kind: 'load', msg: { kind: 'load_cancelled' } });
        expect(state.model.load.status).toBe('cancelled');
        expect(state.effects.find((e) => (e as any).original?.kind === 'cancel' && (e as any).original?.abortKey === 'bigload')).toBeDefined();
    });

    it('Replay: should yield identical final model', () => {
        // 1. Initial
        let state = initialModel;
        const log: MsgLogEntry[] = [];
        const push = (msg: AppMsg) => {
            log.push({ msg, ts: Date.now() });
            const { model } = update(state, msg);
            state = model;
        };

        // 2. Perform actions
        push({ kind: 'timer', msg: { kind: 'timer_started' } });
        push({ kind: 'timer', msg: { kind: 'timer_ticked' } });
        push({ kind: 'search', msg: { kind: 'search_changed', query: 'test' } });
        push({ kind: 'search', msg: { kind: 'search_succeeded', results: [], requestId: 1 } });

        const finalState = state;

        // 3. Replay
        const replayedSnapshot = replay({
            initialModel,
            update,
            log
        });

        expect(JSON.stringify(replayedSnapshot)).toBe(JSON.stringify(finalState));
    });
});
