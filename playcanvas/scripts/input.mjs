export function createInputState() {
    return {
        forward: false,
        backward: false,
        left: false,
        right: false,
        sprint: false,
        jump: false,
        interact: false,
        mouseX: 0,
        mouseY: 0,
        pointerLocked: false
    };
}

export function bindInput(state, canvas) {
    const keys = {
        KeyW: 'forward',
        KeyS: 'backward',
        KeyA: 'left',
        KeyD: 'right',
        ShiftLeft: 'sprint',
        ShiftRight: 'sprint',
        Space: 'jump',
        KeyE: 'interact'
    };

    const onKeyDown = (event) => {
        const key = keys[event.code];
        if (key) state[key] = true;
        if (event.code === 'Space') event.preventDefault();
    };

    const onKeyUp = (event) => {
        const key = keys[event.code];
        if (key) state[key] = false;
    };

    const onMouseMove = (event) => {
        if (state.pointerLocked) {
            state.mouseX += event.movementX;
            state.mouseY += event.movementY;
        }
    };

    const onPointerLockChange = () => {
        state.pointerLocked = document.pointerLockElement === canvas;
    };

    const onCanvasClick = () => {
        if (!state.pointerLocked) canvas.requestPointerLock();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    canvas.addEventListener('click', onCanvasClick);

    return () => {
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('pointerlockchange', onPointerLockChange);
        canvas.removeEventListener('click', onCanvasClick);
    };
}

export function consumeMouseDelta(state) {
    const dx = state.mouseX;
    const dy = state.mouseY;
    state.mouseX = 0;
    state.mouseY = 0;
    return { dx, dy };
}
