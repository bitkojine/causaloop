import { createDispatcher, replay, MsgLogEntry, Snapshot, Effect, CoreEffect } from '@causaloop/core';
import { BrowserRunner } from '@causaloop/platform-browser';
import { initialModel, update, AppModel, AppMsg } from './app.js';
import * as Search from './features/search/search.js';
import * as Load from './features/load/load.js';
import * as Timer from './features/timer/timer.js';
import * as AnimationFeature from './features/animation/animation.js';
import * as WorkerFeature from './features/worker/worker.js';
import * as Devtools from './features/devtools/devtools.js';

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

const featureContainers = new Map<string, HTMLElement>();

function render(snapshot: AppModel) {
    const msgLog = dispatcher.getMsgLog();

    const onReplay = (log: MsgLogEntry[], model: Snapshot<AppModel>) => {
        const finalSnapshot = replay({
            initialModel: model,
            update,
            log
        });
        const isMatched = JSON.stringify(finalSnapshot) === JSON.stringify(snapshot);
        console.info('[REPLAY] Result:', isMatched ? 'MATCH' : 'MISMATCH');
        dispatcher.dispatch({ kind: 'devtools', msg: { kind: 'replay_completed', success: isMatched } });
    };

    const dispatch = (msg: AppMsg) => dispatcher.dispatch(msg);

    // Ensure stable containers exist
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const features: Array<{ key: keyof AppModel, view: (s: any, d: (m: AppMsg) => void) => HTMLElement }> = [
        { key: 'search', view: (s: Search.SearchModel, d) => Search.view(s, (m: Search.SearchMsg) => d({ kind: 'search', msg: m })) },
        { key: 'load', view: (s: Load.LoadModel, d) => Load.view(s, (m: Load.LoadMsg) => d({ kind: 'load', msg: m })) },
        { key: 'timer', view: (s: Timer.TimerModel, d) => Timer.view(s, (m: Timer.TimerMsg) => d({ kind: 'timer', msg: m })) },
        { key: 'animation', view: (s: AnimationFeature.AnimationModel, d) => AnimationFeature.view(s, (m: AnimationFeature.AnimationMsg) => d({ kind: 'animation', msg: m })) },
        { key: 'worker', view: (s: WorkerFeature.WorkerModel, d) => WorkerFeature.view(s, (m: WorkerFeature.WorkerMsg) => d({ kind: 'worker', msg: m })) },
    ];

    if (appRoot.children.length === 0) {
        features.forEach(({ key }) => {
            const container = document.createElement('div');
            container.id = `feature-${String(key)}`;
            featureContainers.set(String(key), container);
            appRoot.appendChild(container);
        });

        const devtoolsContainer = document.createElement('div');
        devtoolsContainer.id = 'feature-devtools';
        featureContainers.set('devtools', devtoolsContainer);
        appRoot.appendChild(devtoolsContainer);
    }

    // Update each feature container surgically
    features.forEach(({ key, view: viewFn }) => {
        const container = featureContainers.get(String(key))!;
        const featureSnapshot = snapshot[key];

        const lastSnapshot = container.getAttribute('data-last-snapshot');
        const currentSnapshotJson = JSON.stringify(featureSnapshot);

        if (lastSnapshot !== currentSnapshotJson) {
            // Surgical update to preserve stable DOM nodes (buttons, inputs) 
            // even during high-frequency model updates.
            if (key === 'animation') {
                const animSnapshot = featureSnapshot as AnimationFeature.AnimationModel;
                const box = container.querySelector('.animation-box') as HTMLElement;
                const startBtn = container.querySelector('.start-btn') as HTMLButtonElement;
                const stopBtn = container.querySelector('.stop-btn') as HTMLButtonElement;
                if (box && startBtn && stopBtn) {
                    box.style.transform = `rotate(${animSnapshot.angle}rad)`;
                    startBtn.disabled = animSnapshot.isRunning;
                    stopBtn.disabled = !animSnapshot.isRunning;
                    container.setAttribute('data-last-snapshot', currentSnapshotJson);
                    return;
                }
            } else if (key === 'timer') {
                const timerSnapshot = featureSnapshot as Timer.TimerModel;
                const startBtn = container.querySelector('.start-btn') as HTMLButtonElement;
                const stopBtn = container.querySelector('.stop-btn') as HTMLButtonElement;
                const countPara = container.querySelector('p') as HTMLElement;
                if (startBtn && stopBtn && countPara) {
                    startBtn.disabled = timerSnapshot.isRunning;
                    stopBtn.disabled = !timerSnapshot.isRunning;
                    countPara.innerText = `Count: ${timerSnapshot.count}`;
                    container.setAttribute('data-last-snapshot', currentSnapshotJson);
                    return;
                }
            }

            container.replaceChildren(viewFn(featureSnapshot, dispatch));
            container.setAttribute('data-last-snapshot', currentSnapshotJson);
        }
    });

    // DevTools update
    const devtoolsContainer = featureContainers.get('devtools')!;
    const devtoolsSnapshotJson = JSON.stringify({ s: snapshot.devtools, logLen: msgLog.length });
    if (devtoolsContainer.getAttribute('data-last-snapshot') !== devtoolsSnapshotJson) {
        // Only surgical update if it's already open to avoid replacing log list churn
        const logDiv = devtoolsContainer.querySelector('.log') as HTMLElement;
        if (logDiv && snapshot.devtools.isOpen) {
            logDiv.innerText = msgLog
                .slice(-10)
                .map((e) => `[${new Date(e.ts).toLocaleTimeString()}] ${e.msg.kind}`)
                .join('\n');
            // Also update replay result if exists
            let resultPara = devtoolsContainer.querySelector('.replay-result') as HTMLElement; // Changed selector to class only
            if (snapshot.devtools.lastReplayResult) {
                if (!resultPara) {
                    resultPara = document.createElement('p');
                    resultPara.className = 'replay-result';
                    devtoolsContainer.appendChild(resultPara);
                }
                resultPara.innerText = `Replay result: ${snapshot.devtools.lastReplayResult}`;
            }
            // Update callback to avoid closure staleness
            const replayBtn = devtoolsContainer.querySelector('.replay-btn') as HTMLButtonElement;
            if (replayBtn) {
                replayBtn.onclick = () => onReplay([...msgLog], initialModel);
            }

            devtoolsContainer.setAttribute('data-last-snapshot', devtoolsSnapshotJson);
            return;
        }
        devtoolsContainer.replaceChildren(Devtools.view(
            snapshot.devtools,
            msgLog,
            initialModel,
            onReplay,
            (m) => dispatch({ kind: 'devtools', msg: m })
        ));
        devtoolsContainer.setAttribute('data-last-snapshot', devtoolsSnapshotJson);
    }
}

// Initial render
render(dispatcher.getSnapshot());
