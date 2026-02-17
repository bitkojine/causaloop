import { Model, UpdateResult, FetchEffect, Snapshot, CancelEffect } from '@causaloop/core';

export interface LoadModel extends Model {
    readonly status: 'idle' | 'loading' | 'success' | 'error' | 'cancelled';
    readonly data: unknown | null;
}

export type LoadMsg =
    | { kind: 'load_requested' }
    | { kind: 'load_succeeded'; data: unknown }
    | { kind: 'load_failed'; error: Error }
    | { kind: 'load_cancelled' };

export const initialModel: LoadModel = {
    status: 'idle',
    data: null,
};

export function update(model: LoadModel, msg: LoadMsg): UpdateResult<LoadModel> {
    switch (msg.kind) {
        case 'load_requested': {
            const effect: FetchEffect<LoadMsg> = {
                kind: 'fetch',
                requestId: 'bigload',
                purpose: 'Load big data',
                url: 'https://jsonplaceholder.typicode.com/photos', // Usually large
                abortKey: 'bigload',
                onSuccess: (data: unknown) => ({ kind: 'load_succeeded', data }),
                onError: (error: Error) => ({ kind: 'load_failed', error }),
            };
            return {
                model: { ...model, status: 'loading', data: null },
                effects: [effect],
            };
        }
        case 'load_succeeded':
            return {
                model: { ...model, status: 'success', data: msg.data },
                effects: [],
            };
        case 'load_failed':
            return {
                model: { ...model, status: 'error' },
                effects: [],
            };
        case 'load_cancelled':
            return {
                model: { ...model, status: 'cancelled' },
                effects: [{ kind: 'cancel', abortKey: 'bigload' } as CancelEffect],
            };
    }
}

export function view(snapshot: Snapshot<LoadModel>, dispatch: (msg: LoadMsg) => void): HTMLElement {
    const container = document.createElement('div');
    container.className = 'feature-container';

    const h3 = document.createElement('h3');
    h3.innerText = 'Feature B: Cancellation';
    container.appendChild(h3);

    const btnContainer = document.createElement('div');
    btnContainer.className = 'btn-group';

    const loadBtn = document.createElement('button');
    loadBtn.innerText = 'Load Big Data';
    loadBtn.onclick = () => dispatch({ kind: 'load_requested' });
    loadBtn.disabled = snapshot.status === 'loading';
    btnContainer.appendChild(loadBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = 'Cancel';
    cancelBtn.onclick = () => dispatch({ kind: 'load_cancelled' });
    cancelBtn.disabled = snapshot.status !== 'loading';
    btnContainer.appendChild(cancelBtn);

    container.appendChild(btnContainer);

    const statusPara = document.createElement('p');
    statusPara.innerText = `Status: ${snapshot.status}`;
    container.appendChild(statusPara);

    return container;
}
