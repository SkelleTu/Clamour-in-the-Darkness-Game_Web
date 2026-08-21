import * as THREE from 'three';

export type InputState = {
  forward: boolean; backward: boolean; left: boolean; right: boolean;
  sprint: boolean; jump: boolean; interact: boolean;
  spawnObject: boolean; triggerHorror: boolean;
  mouseX: number; mouseY: number;
  pointerLocked: boolean;
};

export function createInputState(): InputState {
  return {
    forward: false, backward: false, left: false, right: false,
    sprint: false, jump: false, interact: false,
    spawnObject: false, triggerHorror: false,
    mouseX: 0, mouseY: 0,
    pointerLocked: false,
  };
}

export function bindInput(state: InputState, canvas: HTMLElement) {
  const keyMap: Record<string, keyof InputState> = {
    KeyW: 'forward', KeyS: 'backward', KeyA: 'left', KeyD: 'right',
    ShiftLeft: 'sprint', ShiftRight: 'sprint',
    Space: 'jump', KeyE: 'interact',
    KeyF: 'spawnObject', KeyH: 'triggerHorror',
  };

  const onKey = (e: KeyboardEvent, down: boolean) => {
    const key = keyMap[e.code];
    if (key) (state as Record<string, boolean>)[key as string] = down;
    if (e.code === 'Space' && down) e.preventDefault();
  };

  document.addEventListener('keydown', (e) => onKey(e, true));
  document.addEventListener('keyup', (e) => onKey(e, false));

  document.addEventListener('mousemove', (e) => {
    if (state.pointerLocked) {
      state.mouseX += e.movementX;
      state.mouseY += e.movementY;
    }
  });

  canvas.addEventListener('click', () => {
    canvas.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', () => {
    state.pointerLocked = document.pointerLockElement === canvas;
  });
}

export function consumeMouseDelta(state: InputState): { dx: number; dy: number } {
  const dx = state.mouseX;
  const dy = state.mouseY;
  state.mouseX = 0;
  state.mouseY = 0;
  return { dx, dy };
}
