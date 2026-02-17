import { Model, Msg, UpdateResult, Snapshot, TimerEffect, CancelEffect } from '@causaloop/core';

export interface TimerModel extends Model {
    readonly count: number;
    readonly isRunning: boolean;
}

export type TimerMsg =
    | { kind: 'timer_started' }
    | { kind: 'timer_ticked' }
    | { kind: 'timer_stopped' };

export const initialModel: TimerModel = {
    count: 0,
    isRunning: false,
};

export function update(model: TimerModel, msg: TimerMsg): UpdateResult<TimerModel> {
    switch (msg.kind) {
        case 'timer_started':
            if (model.isRunning) return { model, effects: [] };
            return {
                model: { ...model, isRunning: true },
                effects: [{ kind: 'timer', timeoutMs: 1000, onTimeout: () => ({ kind: 'timer_ticked' }) } as TimerEffect<TimerMsg>],
            };
        case 'timer_ticked':
            if (!model.isRunning) return { model, effects: [] };
            return {
                model: { ...model, count: model.count + 1 },
                effects: [{ kind: 'timer', timeoutMs: 1000, onTimeout: () => ({ kind: 'timer_ticked' }) } as TimerEffect<TimerMsg>],
            };
        case 'timer_stopped':
            return {
                model: { ...model, isRunning: false },
                effects: [], // Timer effect in platform-browser should probably support cancellation too, but for simplicity we rely on the reducer ignoring ticks if not running
            };
    }
}

export function view(snapshot: Snapshot<TimerModel>, dispatch: (msg: TimerMsg) => void): HTMLElement {
    const container = document.createElement('div');
    container.className = 'feature-container';

    const h3 = document.createElement('h3');
    h3.innerText = 'Feature C: Timer';
    container.appendChild(h3);

    const countPara = document.createElement('p');
    countPara.innerText = `Count: ${snapshot.count}`;
    container.appendChild(countPara);

    const btnContainer = document.createElement('div');
    btnContainer.className = 'btn-group';

    const startBtn = document.createElement('button');
    startBtn.innerText = 'Start Timer';
    startBtn.onclick = () => dispatch({ kind: 'timer_started' });
    startBtn.disabled = snapshot.isRunning;
    btnContainer.appendChild(startBtn);

    const stopBtn = document.createElement('button');
    stopBtn.innerText = 'Stop Timer';
    stopBtn.onclick = () => dispatch({ kind: 'timer_stopped' });
    stopBtn.disabled = !snapshot.isRunning;
    btnContainer.appendChild(stopBtn);

    container.appendChild(btnContainer);

    return container;
}
