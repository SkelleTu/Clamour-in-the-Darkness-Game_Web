export type InputState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
  interact: boolean;
  triggerHorror: boolean;
  mouseX: number;
  mouseY: number;
  pointerLocked: boolean;
  touchLook: boolean;
};

export function createInputState(): InputState {
  return {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
    interact: false,
    triggerHorror: false,
    mouseX: 0,
    mouseY: 0,
    pointerLocked: false,
    touchLook: false,
  };
}

export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

export function bindInput(
  state: InputState,
  canvas: HTMLElement,
  onInteract?: () => void,
  onHorror?: () => void,
) {
  const isTouch = isTouchDevice();

  const keyMap: Record<string, keyof InputState> = {
    KeyW: 'forward',
    KeyS: 'backward',
    KeyA: 'left',
    KeyD: 'right',
    ShiftLeft: 'sprint',
    ShiftRight: 'sprint',
    Space: 'jump',
    KeyE: 'interact',
    KeyH: 'triggerHorror',
  };

  const onKey = (event: KeyboardEvent, down: boolean) => {
    const key = keyMap[event.code];
    if (key) {
      state[key] = down;
    }

    if (event.code === 'Space' && down) event.preventDefault();
    if (event.code === 'KeyE' && down) onInteract?.();
    if (event.code === 'KeyH' && down) onHorror?.();
  };

  const onKeyDown = (event: KeyboardEvent) => onKey(event, true);
  const onKeyUp = (event: KeyboardEvent) => onKey(event, false);

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  const onMouseMove = (event: MouseEvent) => {
    if (state.pointerLocked) {
      state.mouseX += event.movementX;
      state.mouseY += event.movementY;
    }
  };

  const onPointerLockChange = () => {
    state.pointerLocked = document.pointerLockElement === canvas;
  };

  const onCanvasClick = () => {
    if (!isTouch && !state.pointerLocked) {
      void canvas.requestPointerLock();
    }
  };

  if (!isTouch) {
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    canvas.addEventListener('click', onCanvasClick);
  }

  return () => {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('pointerlockchange', onPointerLockChange);
    canvas.removeEventListener('click', onCanvasClick);
  };
}

export function consumeMouseDelta(state: InputState) {
  const dx = state.mouseX;
  const dy = state.mouseY;
  state.mouseX = 0;
  state.mouseY = 0;
  return { dx, dy };
}
