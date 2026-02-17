import { Model, Msg, UpdateResult, FetchEffect, Snapshot } from '@causaloop/core';

export interface SearchModel extends Model {
    readonly query: string;
    readonly status: 'idle' | 'loading' | 'success' | 'error' | 'stale';
    readonly results: any[];
    readonly lastRequestId: number;
}

export type SearchMsg =
    | { kind: 'search_changed'; query: string }
    | { kind: 'search_succeeded'; results: any; requestId: number }
    | { kind: 'search_failed'; error: Error; requestId: number };

export const initialModel: SearchModel = {
    query: '',
    status: 'idle',
    results: [],
    lastRequestId: 0,
};

export function update(model: SearchModel, msg: SearchMsg): UpdateResult<SearchModel> {
    switch (msg.kind) {
        case 'search_changed': {
            const nextRequestId = model.lastRequestId + 1;
            const effect: FetchEffect<SearchMsg> = {
                kind: 'fetch',
                requestId: String(nextRequestId),
                purpose: 'Search query',
                url: `https://jsonplaceholder.typicode.com/posts?q=${encodeURIComponent(msg.query)}`,
                abortKey: 'search',
                onSuccess: (data: any) => ({ kind: 'search_succeeded', results: data, requestId: nextRequestId }),
                onError: (error: Error) => ({ kind: 'search_failed', error: error, requestId: nextRequestId }),
            };
            return {
                model: { ...model, query: msg.query, status: 'loading', lastRequestId: nextRequestId },
                effects: [effect],
            };
        }
        case 'search_succeeded':
            if (msg.requestId !== model.lastRequestId) {
                return { model, effects: [] }; // Ignore stale
            }
            return {
                model: { ...model, status: 'success', results: msg.results },
                effects: [],
            };
        case 'search_failed':
            if (msg.requestId !== model.lastRequestId) {
                return { model, effects: [] }; // Ignore stale
            }
            return {
                model: { ...model, status: 'error' },
                effects: [],
            };
    }
}

export function view(snapshot: Snapshot<SearchModel>, dispatch: (msg: SearchMsg) => void): HTMLElement {
    const container = document.createElement('div');
    container.className = 'feature-container';

    const h3 = document.createElement('h3');
    h3.innerText = 'Feature A: Stale-Safe Search';
    container.appendChild(h3);

    const input = document.createElement('input');
    input.type = 'text';
    input.value = snapshot.query;
    input.placeholder = 'Search posts...';
    input.oninput = (e) => dispatch({ kind: 'search_changed', query: (e.target as HTMLInputElement).value });
    container.appendChild(input);

    const statusPara = document.createElement('p');
    statusPara.innerText = `Status: ${snapshot.status} (ID: ${snapshot.lastRequestId})`;
    container.appendChild(statusPara);

    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'log';
    if (snapshot.results.length > 0) {
        resultsDiv.innerText = snapshot.results.map((r: any) => r.title).join('\n');
    } else if (snapshot.status === 'success') {
        resultsDiv.innerText = 'No results found.';
    }
    container.appendChild(resultsDiv);

    return container;
}
