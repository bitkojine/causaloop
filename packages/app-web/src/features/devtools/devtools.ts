import { Model, UpdateResult, Snapshot, MsgLogEntry } from '@causaloop/core';

export interface DevtoolsModel extends Model {
    readonly isOpen: boolean;
    readonly lastReplayResult: 'success' | 'failure' | null;
}

export type DevtoolsMsg =
    | { kind: 'devtools_toggled' }
    | { kind: 'replay_triggered'; log: MsgLogEntry[]; initialModel: Snapshot<Model> }
    | { kind: 'replay_completed'; success: boolean };

export const initialModel: DevtoolsModel = {
    isOpen: false,
    lastReplayResult: null,
};

export function update(model: DevtoolsModel, msg: DevtoolsMsg): UpdateResult<DevtoolsModel> {
    switch (msg.kind) {
        case 'devtools_toggled':
            return {
                model: { ...model, isOpen: !model.isOpen },
                effects: [],
            };
        case 'replay_triggered':
            // The actual replay logic should probably be outside the dispatcher to be fully deterministic and safe
            // But for the UI we just trigger it and let the main loop handle the notification
            return { model, effects: [] };
        case 'replay_completed':
            return {
                model: { ...model, lastReplayResult: msg.success ? 'success' : 'failure' },
                effects: [],
            };
    }
}

export function view<M extends Model>(
    snapshot: Snapshot<DevtoolsModel>,
    msgLog: readonly MsgLogEntry[],
    currentModel: Snapshot<M>,
    onReplay: (log: MsgLogEntry[], initialModel: Snapshot<M>) => void,
    dispatch: (msg: DevtoolsMsg) => void
): HTMLElement {
    const container = document.createElement('div');
    container.className = 'devtools';
    if (!snapshot.isOpen) {
        const toggle = document.createElement('button');
        toggle.innerText = 'DevTools';
        toggle.onclick = () => dispatch({ kind: 'devtools_toggled' });
        container.appendChild(toggle);
        return container;
    }

    const h3 = document.createElement('h3');
    h3.innerText = 'DevTools';
    container.appendChild(h3);

    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'Close';
    closeBtn.onclick = () => dispatch({ kind: 'devtools_toggled' });
    container.appendChild(closeBtn);

    const logDiv = document.createElement('div');
    logDiv.className = 'log';
    logDiv.innerText = msgLog
        .slice(-10)
        .map((e) => `[${new Date(e.ts).toLocaleTimeString()}] ${e.msg.kind}`)
        .join('\n');
    container.appendChild(logDiv);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group';

    const exportBtn = document.createElement('button');
    exportBtn.className = 'export-btn';
    exportBtn.innerText = 'Export Log';
    exportBtn.onclick = () => {
        const data = JSON.stringify(msgLog);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'causaloop-log.json';
        a.click();
    };
    btnGroup.appendChild(exportBtn);

    const replayBtn = document.createElement('button');
    replayBtn.className = 'replay-btn';
    replayBtn.innerText = 'Replay Log';
    replayBtn.onclick = () => onReplay([...msgLog], currentModel);
    btnGroup.appendChild(replayBtn);

    container.appendChild(btnGroup);

    if (snapshot.lastReplayResult) {
        const resultPara = document.createElement('p');
        resultPara.className = 'replay-result';
        resultPara.innerText = `Replay result: ${snapshot.lastReplayResult}`;
        container.appendChild(resultPara);
    }

    return container;
}
