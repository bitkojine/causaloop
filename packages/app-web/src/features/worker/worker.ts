import { Model, UpdateResult, Snapshot, WorkerEffect } from '@causaloop/core';

export interface WorkerModel extends Model {
    readonly result: number | null;
    readonly status: 'idle' | 'computing' | 'done' | 'error';
    readonly lastTaskId: number;
}

export type WorkerMsg =
    | { kind: 'compute_requested'; n: number }
    | { kind: 'compute_succeeded'; result: number; taskId: number }
    | { kind: 'compute_failed'; error: Error; taskId: number };

export const initialModel: WorkerModel = {
    result: null,
    status: 'idle',
    lastTaskId: 0,
};

export function update(model: WorkerModel, msg: WorkerMsg): UpdateResult<WorkerModel> {
    switch (msg.kind) {
        case 'compute_requested': {
            const nextTaskId = model.lastTaskId + 1;
            const effect: WorkerEffect<WorkerMsg> = {
                kind: 'worker',
                taskId: String(nextTaskId),
                scriptUrl: new URL('./compute.worker.ts', import.meta.url).href,
                payload: msg.n,
                onSuccess: (res: unknown) => ({ kind: 'compute_succeeded', result: res as number, taskId: nextTaskId }),
                onError: (err) => ({ kind: 'compute_failed', error: err, taskId: nextTaskId }),
            };
            return {
                model: { ...model, status: 'computing', lastTaskId: nextTaskId },
                effects: [effect],
            };
        }
        case 'compute_succeeded':
            if (msg.taskId !== model.lastTaskId) return { model, effects: [] };
            return {
                model: { ...model, status: 'done', result: msg.result },
                effects: [],
            };
        case 'compute_failed':
            if (msg.taskId !== model.lastTaskId) return { model, effects: [] };
            return {
                model: { ...model, status: 'error' },
                effects: [],
            };
    }
}

export function view(snapshot: Snapshot<WorkerModel>, dispatch: (msg: WorkerMsg) => void): HTMLElement {
    const container = document.createElement('div');
    container.className = 'feature-container';

    const h3 = document.createElement('h3');
    h3.innerText = 'Feature E: Worker Compute';
    container.appendChild(h3);

    const input = document.createElement('input');
    input.type = 'number';
    input.value = '100000';
    container.appendChild(input);

    const computeBtn = document.createElement('button');
    computeBtn.innerText = 'Compute Primes';
    computeBtn.onclick = () => dispatch({ kind: 'compute_requested', n: parseInt(input.value) });
    computeBtn.disabled = snapshot.status === 'computing';
    container.appendChild(computeBtn);

    const statusPara = document.createElement('p');
    statusPara.innerText = `Status: ${snapshot.status}`;
    if (snapshot.result !== null) {
        statusPara.innerText += ` | Result: ${snapshot.result}`;
    }
    container.appendChild(statusPara);

    return container;
}
