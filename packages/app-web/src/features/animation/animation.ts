import { Model, UpdateResult, Snapshot, AnimationFrameEffect } from '@causaloop/core';

export interface AnimationModel extends Model {
    readonly angle: number;
    readonly isRunning: boolean;
}

export type AnimationMsg =
    | { kind: 'animation_started' }
    | { kind: 'animation_frame'; time: number }
    | { kind: 'animation_stopped' };

export const initialModel: AnimationModel = {
    angle: 0,
    isRunning: false,
};

export function update(model: AnimationModel, msg: AnimationMsg): UpdateResult<AnimationModel> {
    switch (msg.kind) {
        case 'animation_started':
            if (model.isRunning) return { model, effects: [] };
            return {
                model: { ...model, isRunning: true },
                effects: [{ kind: 'animationFrame', onFrame: (t: number) => ({ kind: 'animation_frame', time: t }) } as AnimationFrameEffect<AnimationMsg>],
            };
        case 'animation_frame':
            if (!model.isRunning) return { model, effects: [] };
            return {
                model: { ...model, angle: model.angle + 0.1 },
                effects: [{ kind: 'animationFrame', onFrame: (t: number) => ({ kind: 'animation_frame', time: t }) } as AnimationFrameEffect<AnimationMsg>],
            };
        case 'animation_stopped':
            return {
                model: { ...model, isRunning: false },
                effects: [],
            };
    }
}

export function view(snapshot: Snapshot<AnimationModel>, dispatch: (msg: AnimationMsg) => void): HTMLElement {
    const container = document.createElement('div');
    container.className = 'feature-container';

    const h3 = document.createElement('h3');
    h3.innerText = 'Feature D: Animation';
    container.appendChild(h3);

    const box = document.createElement('div');
    box.style.width = '50px';
    box.style.height = '50px';
    box.style.background = '#007aff';
    box.style.margin = '10px auto';
    box.style.transform = `rotate(${snapshot.angle}rad)`;
    container.appendChild(box);

    const btnContainer = document.createElement('div');
    btnContainer.className = 'btn-group';

    const startBtn = document.createElement('button');
    startBtn.innerText = 'Start Animation';
    startBtn.onclick = () => dispatch({ kind: 'animation_started' });
    startBtn.disabled = snapshot.isRunning;
    btnContainer.appendChild(startBtn);

    const stopBtn = document.createElement('button');
    stopBtn.innerText = 'Stop Animation';
    stopBtn.onclick = () => dispatch({ kind: 'animation_stopped' });
    stopBtn.disabled = !snapshot.isRunning;
    btnContainer.appendChild(stopBtn);

    container.appendChild(btnContainer);

    return container;
}
