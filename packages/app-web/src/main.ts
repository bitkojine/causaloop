import { createDispatcher, replay, MsgLogEntry, Snapshot, Effect, CoreEffect } from '@causaloop/core';
import { BrowserRunner } from '@causaloop/platform-browser';
import { initialModel, update, view, AppModel, AppMsg } from './app.js';

const appRoot = document.getElementById('app')!;
const runner = new BrowserRunner();

interface WrappedEffect {
    kind: 'wrapper';
    original: Effect;
    wrap: (msg: unknown) => AppMsg;
}

const dispatcher = createDispatcher<AppModel, AppMsg, Effect | WrappedEffect>({
    model: initialModel,
    update,
    effectRunner: (effect, dispatch) => {
        if (effect && typeof effect === 'object' && 'kind' in effect && effect.kind === 'wrapper') {
            const wrapped = effect as WrappedEffect;
            runner.run(wrapped.original as CoreEffect, (msg: unknown) => dispatch(wrapped.wrap(msg)));
        } else {
            runner.run(effect as CoreEffect, dispatch as (msg: unknown) => void);
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
    const onReplay = (log: MsgLogEntry[], model: Snapshot<AppModel>) => {
        const finalSnapshot = replay({
            initialModel: model, // Replay from the model provided in the view
            update,
            log
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
