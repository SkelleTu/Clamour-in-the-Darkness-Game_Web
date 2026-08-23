import * as THREE from 'three';
import { RULES } from './rules';
import { createInputState, bindInput, isTouchDevice } from './input';
import { createPlayerState, updatePlayer, getCameraMatrix } from './player';
import { buildWorld, spawnTestObject } from './world';
import { createStreetViewEnvironment } from './streetView';
import { spawnHorrorEvent, updateHorrorEvents } from './horror';
import { savePlayerState, broadcastHorrorEvent } from './persistence';
import type { StreetViewMetadata } from '@/lib/universalServer';
import type { HorrorEvent } from './horror';

export type GameCallbacks = {
  onVitalsChange: (health: number, stamina: number) => void;
  onPointerLock: (locked: boolean) => void;
  onStreetViewAttribution?: (text: string | null) => void;
};

export type GameOptions = {
  streetView: StreetViewMetadata;
  initialYaw: number;
};

export async function createGame(canvas: HTMLCanvasElement, callbacks: GameCallbacks, options: GameOptions) {
  const isTouch = isTouchDevice();

  let sessionId = localStorage.getItem('clamour_player_id') ?? '';
  if (!sessionId) {
    sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('clamour_player_id', sessionId);
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const world = buildWorld(scene);

  // The Street View environment is the visual world for this address. Keep the
  // gameplay floor/collision layer, but hide the placeholder building meshes.
  for (const object of world.objects) object.mesh.visible = false;

  const streetViewEnvironment = await createStreetViewEnvironment(scene, options.streetView);
  callbacks.onStreetViewAttribution?.(streetViewEnvironment.attribution);

  const camera = new THREE.PerspectiveCamera(
    RULES.streetView.fov,
    canvas.clientWidth / canvas.clientHeight,
    0.05,
    400,
  );
  scene.add(camera);

  const player = createPlayerState(RULES.world.defaultLatitude, RULES.world.defaultLongitude);
  player.yaw = options.initialYaw;
  player.position.set(0, RULES.movement.controllerHeight / 2, 0);

  const input = createInputState();
  bindInput(input, canvas);

  const horrorEvents: HorrorEvent[] = [];
  let autosaveTimer = 0;
  let lastPointerLock = false;
  let jumpConsumed = false;
  let spawnConsumed = false;
  let horrorConsumed = false;
  let interactConsumed = false;
  let touchLookX = 0;
  let touchLookY = 0;
  const spawnedObjects: THREE.Mesh[] = [];
  let animFrameId = 0;
  const clock = new THREE.Clock();

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);

  const touchMove = { x: 0, y: 0 };
  function setTouchMove(x: number, y: number) {
    touchMove.x = x;
    touchMove.y = y;
    input.forward = y < -0.15;
    input.backward = y > 0.15;
    input.left = x < -0.15;
    input.right = x > 0.15;
  }
  function addTouchLook(dx: number, dy: number) { touchLookX += dx; touchLookY += dy; }
  function triggerTouchJump() { input.jump = true; }
  function triggerTouchInteract() { input.interact = true; }
  function triggerTouchHorror() { input.triggerHorror = true; }
  function setTouchSprint(active: boolean) { input.sprint = active; }

  function tick() {
    animFrameId = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.1);

    if (!isTouch && input.pointerLocked !== lastPointerLock) {
      lastPointerLock = input.pointerLocked;
      callbacks.onPointerLock(input.pointerLocked);
    }
    if (isTouch && !lastPointerLock) {
      lastPointerLock = true;
      callbacks.onPointerLock(true);
    }

    if (isTouch && (touchLookX !== 0 || touchLookY !== 0)) {
      input.mouseX += touchLookX;
      input.mouseY += touchLookY;
      touchLookX = 0;
      touchLookY = 0;
    }

    if (!input.jump) jumpConsumed = false;
    if (!input.spawnObject) spawnConsumed = false;
    if (!input.triggerHorror) horrorConsumed = false;
    if (!input.interact) interactConsumed = false;

    const jump = input.jump && !jumpConsumed;
    if (jump) jumpConsumed = true;

    if (input.spawnObject && !spawnConsumed) {
      spawnConsumed = true;
      spawnedObjects.push(spawnTestObject(scene, player.position, world.colliders));
    }

    if (input.triggerHorror && !horrorConsumed) {
      horrorConsumed = true;
      const ev = spawnHorrorEvent(scene, player.position);
      horrorEvents.push(ev);
      void broadcastHorrorEvent(sessionId, ev.position.x, ev.position.y, ev.position.z);
    }

    if (input.interact && !interactConsumed) {
      interactConsumed = true;
    }

    const savedJump = input.jump;
    input.jump = jump;
    updatePlayer(player, input, dt, world.colliders);
    if (isTouch) input.jump = false;
    input.jump = savedJump;
    if (isTouch) input.interact = false;
    if (isTouch) input.triggerHorror = false;

    // Keep the Street View shell centered on the player so it behaves like the
    // current address is the visual environment around the player.
    streetViewEnvironment.mesh.position.copy(player.position);

    const mat = getCameraMatrix(player);
    mat.decompose(camera.position, camera.quaternion, new THREE.Vector3());

    updateHorrorEvents(horrorEvents, dt, scene);
    callbacks.onVitalsChange(player.vitals.health, player.vitals.stamina);

    autosaveTimer += dt;
    if (autosaveTimer >= RULES.persistence.autosaveSeconds) {
      autosaveTimer = 0;
      void savePlayerState(sessionId, player.position, player.yaw);
    }

    renderer.render(scene, camera);
  }

  tick();

  return {
    get sessionId() { return sessionId; },
    get player() { return player; },
    get isTouch() { return isTouch; },
    loadPosition(x: number, y: number, z: number, yaw: number) {
      player.position.set(x, y, z);
      player.yaw = yaw;
    },
    touchControls: {
      onMove: setTouchMove,
      onLook: addTouchLook,
      onJump: triggerTouchJump,
      onSprint: setTouchSprint,
      onInteract: triggerTouchInteract,
      onHorror: triggerTouchHorror,
    },
    destroy() {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', resize);
      streetViewEnvironment.dispose();
      renderer.dispose();
    },
  };
}
