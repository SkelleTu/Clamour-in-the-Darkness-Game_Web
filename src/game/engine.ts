import * as THREE from 'three';
import { RULES } from './rules';
import { InputState, createInputState, bindInput } from './input';
import { PlayerState, createPlayerState, updatePlayer, getCameraMatrix } from './player';
import { buildWorld, spawnTestObject, World } from './world';
import { HorrorEvent, spawnHorrorEvent, updateHorrorEvents } from './horror';
import { savePlayerState, broadcastHorrorEvent } from './persistence';

export type GameCallbacks = {
  onVitalsChange: (health: number, stamina: number) => void;
  onPointerLock: (locked: boolean) => void;
};

export function createGame(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
  // Session id
  let sessionId = localStorage.getItem('clamour_session') ?? '';
  if (!sessionId) {
    sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('clamour_session', sessionId);
  }

  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Scene
  const scene = new THREE.Scene();
  const world = buildWorld(scene);

  // Camera
  const camera = new THREE.PerspectiveCamera(
    RULES.streetView.fov,
    canvas.clientWidth / canvas.clientHeight,
    0.05, 400,
  );
  scene.add(camera);

  // Player
  const player = createPlayerState(RULES.world.defaultLatitude, RULES.world.defaultLongitude);

  // Input
  const input = createInputState();
  bindInput(input, canvas);

  // Horror events
  const horrorEvents: HorrorEvent[] = [];

  // Crosshair pulse helper
  let interactCooldown = 0;
  let autosaveTimer = 0;
  let horrorPollTimer = 0;
  let lastPointerLock = false;

  // One-frame flags to avoid hold-trigger
  let jumpConsumed = false;
  let spawnConsumed = false;
  let horrorConsumed = false;

  // Test objects spawned with F
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

  function tick() {
    animFrameId = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.1);

    // pointer lock state
    if (input.pointerLocked !== lastPointerLock) {
      lastPointerLock = input.pointerLocked;
      callbacks.onPointerLock(input.pointerLocked);
    }

    // One-shot keys
    if (!input.jump) jumpConsumed = false;
    if (!input.spawnObject) spawnConsumed = false;
    if (!input.triggerHorror) horrorConsumed = false;

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
      broadcastHorrorEvent(sessionId, ev.position.x, ev.position.y, ev.position.z);
    }

    // Temporarily patch input.jump for one-shot
    const savedJump = input.jump;
    input.jump = jump;
    updatePlayer(player, input, dt, world.colliders);
    input.jump = savedJump;

    // Apply camera
    const mat = getCameraMatrix(player);
    mat.decompose(camera.position, camera.quaternion, new THREE.Vector3());

    // Horror events
    updateHorrorEvents(horrorEvents, dt, scene);

    // Vitals callback (throttled by 60 fps anyway)
    callbacks.onVitalsChange(player.vitals.health, player.vitals.stamina);

    // Autosave
    autosaveTimer += dt;
    if (autosaveTimer >= RULES.persistence.autosaveSeconds) {
      autosaveTimer = 0;
      savePlayerState(sessionId, player.position, player.yaw);
    }

    renderer.render(scene, camera);
  }

  tick();

  return {
    get sessionId() { return sessionId; },
    get player() { return player; },
    loadPosition(x: number, y: number, z: number, yaw: number) {
      player.position.set(x, y, z);
      player.yaw = yaw;
    },
    destroy() {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', resize);
      renderer.dispose();
    },
  };
}
