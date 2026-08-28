import * as THREE from 'three';

export type InputState = {
  forward: boolean; backward: boolean; left: boolean; right: boolean;
  sprint: boolean; jump: boolean; interact: boolean;
  spawnObject: boolean; triggerHorror: boolean;
  mouseX: number; mouseY: number;
  pointerLocked: boolean;
  touchLook: boolean;
  escapePressed: boolean;
};

export function createInputState(): InputState {
  return {
    forward: false, backward: false, left: false, right: false,
    sprint: false, jump: false, interact: false,
    spawnObject: false, triggerHorror: false,
    mouseX: 0, mouseY: 0,
    pointerLocked: false,
    touchLook: false,
    escapePressed: false,
  };
}

export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

export function bindInput(state: InputState, canvas: HTMLElement) {
  const isTouch = isTouchDevice();

  const keyMap: Record<string, keyof InputState> = {
    KeyW: 'forward', KeyS: 'backward', KeyA: 'left', KeyD: 'right',
    ShiftLeft: 'sprint', ShiftRight: 'sprint',
    Space: 'jump', KeyE: 'interact',
    KeyF: 'spawnObject', KeyH: 'triggerHorror',
    Escape: 'escapePressed',
  };

  const pressedKeys = new Set<string>();
  const onKey = (e: KeyboardEvent, down: boolean) => {
    if (!down && e.code === 'Escape') {
      state.escapePressed = false;
      pressedKeys.delete('Escape');
      return;
    }
    const key = keyMap[e.code];
    if (key) (state as unknown as Record<string, boolean>)[key as string] = down;
    if (down && e.code === 'Escape') {
      state.escapePressed = !pressedKeys.has('Escape');
      pressedKeys.add('Escape');
    }
    if (e.code === 'Space' && down) e.preventDefault();
  };

  document.addEventListener('keydown', (e) => onKey(e, true));
  document.addEventListener('keyup', (e) => onKey(e, false));

  // --- Desktop: mouse look via Pointer Lock ---
  if (!isTouch) {
    document.addEventListener('mousemove', (e) => {
      if (state.pointerLocked) {
        state.mouseX += e.movementX;
        state.mouseY += e.movementY;
      }
    });

    canvas.addEventListener('click', () => {
      if (!state.pointerLocked) {
        canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      state.pointerLocked = document.pointerLockElement === canvas;
    });
  }
}

export function consumeMouseDelta(state: InputState): { dx: number; dy: number } {
  const dx = state.mouseX;
  const dy = state.mouseY;
  state.mouseX = 0;
  state.mouseY = 0;
  return { dx, dy };
}
