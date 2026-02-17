import { createDispatcher, replay } from '@causaloop/core';
import { BrowserRunner } from '@causaloop/platform-browser';
import { initialModel, update, view, AppModel, AppMsg } from './app.js';

const appRoot = document.getElementById('app')!;
const runner = new BrowserRunner();

const dispatcher = createDispatcher<AppModel, AppMsg, any>({
    model: initialModel,
    update,
    effectRunner: (effect, dispatch) => {
        // Basic effect wrapping handled in update
        if (effect.original) {
            runner.run(effect.original, (msg: any) => dispatch(effect.wrap(msg)));
        } else {
            runner.run(effect, dispatch as any);
        }
    },
    onCommit: (snapshot) => {
        render(snapshot);
    },
    devMode: true,
    assertInvariants: (model) => {
        if (typeof model.search.lastRequestId !== 'number') throw new Error('Invariant failed');
    }
});

function render(snapshot: AppModel) {
    appRoot.innerHTML = '';
    const onReplay = (log: readonly any[]) => {
        const finalSnapshot = replay({
            initialModel,
            update,
            log: log as any
        });
        const isMatched = JSON.stringify(finalSnapshot) === JSON.stringify(snapshot);
        console.info('[REPLAY] Result:', isMatched ? 'MATCH' : 'MISMATCH');
        dispatcher.dispatch({ kind: 'devtools', msg: { kind: 'replay_completed', success: isMatched } });
    };

    appRoot.appendChild(view(snapshot, dispatcher.getMsgLog(), (msg) => {
        dispatcher.dispatch(msg);
    }, onReplay));
}

// Initial render
render(dispatcher.getSnapshot());
