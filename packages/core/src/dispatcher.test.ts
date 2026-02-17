import { describe, it, expect, vi } from 'vitest';
import { createDispatcher } from './dispatcher.js';
import { Model, Msg, Effect, UpdateResult } from './types.js';

describe('Dispatcher', () => {
    interface TestModel extends Model {
        count: number;
        history: string[];
    }

    type TestMsg = { kind: 'increment' } | { kind: 'nested' } | { kind: 'error' };

    it('should process messages and update model', () => {
        const update = (model: TestModel, msg: TestMsg): UpdateResult<TestModel> => {
            switch (msg.kind) {
                case 'increment':
                    return { model: { ...model, count: model.count + 1 }, effects: [] };
                default:
                    return { model, effects: [] };
            }
        };

        const dispatcher = createDispatcher<TestModel, TestMsg, Effect>({
            model: { count: 0, history: [] },
            update,
            effectRunner: () => { },
        });

        dispatcher.dispatch({ kind: 'increment' });
        expect(dispatcher.getSnapshot().count).toBe(1);
    });

    it('should handle nested dispatches via FIFO queue (no re-entrancy)', () => {
        const history: string[] = [];
        const update = (model: TestModel, msg: TestMsg): UpdateResult<TestModel> => {
            history.push(msg.kind);
            switch (msg.kind) {
                case 'nested':
                    // Attempting re-entrant dispatch
                    dispatcher.dispatch({ kind: 'increment' });
                    return { model: { ...model, history: [...model.history, 'nested'] }, effects: [] };
                case 'increment':
                    return { model: { ...model, count: model.count + 1 }, effects: [] };
                default:
                    return { model, effects: [] };
            }
        };

        const dispatcher = createDispatcher<TestModel, TestMsg, Effect>({
            model: { count: 0, history: [] },
            update,
            effectRunner: () => { },
        });

        dispatcher.dispatch({ kind: 'nested' });

        // Expect 'nested' to finish before 'increment' starts processing next in queue
        // In our implementation, the loop continues until queue is empty.
        expect(history).toEqual(['nested', 'increment']);
        expect(dispatcher.getSnapshot().count).toBe(1);
        expect(dispatcher.getSnapshot().history).toEqual(['nested']);
    });

    it('should deep-freeze model in dev mode', () => {
        const update = (model: TestModel, msg: TestMsg): UpdateResult<TestModel> => {
            return { model, effects: [] };
        };

        const dispatcher = createDispatcher<TestModel, TestMsg, Effect>({
            model: { count: 0, history: [] },
            update,
            effectRunner: () => { },
            devMode: true,
        });

        const snapshot = dispatcher.getSnapshot();
        expect(() => {
            (snapshot as any).count = 10;
        }).toThrow();
    });
});
