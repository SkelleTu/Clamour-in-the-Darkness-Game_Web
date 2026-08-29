import * as THREE from 'three';
import { RULES } from './rules';
import { consumeMouseDelta, type InputState } from './input';

export type Vitals = { health: number; stamina: number; exhausted: boolean };

export type PlayerState = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;   // horizontal look (degrees)
  pitch: number; // vertical look (degrees)
  onGround: boolean;
  vitals: Vitals;
  stumbling: boolean;
  stumbleCooldown: number;
  stumbleTimer: number;
  bobTime: number;
  landingKickTimer: number;
  carrying: boolean;
};

export function createPlayerState(lat: number, lon: number): PlayerState {
  return {
    position: new THREE.Vector3(0, RULES.movement.controllerHeight / 2, 0),
    velocity: new THREE.Vector3(),
    yaw: 0, pitch: 0,
    onGround: false,
    vitals: { health: RULES.vitals.maxHealth, stamina: RULES.vitals.maxStamina, exhausted: false },
    stumbling: false, stumbleCooldown: 0, stumbleTimer: 0,
    bobTime: 0, landingKickTimer: 0,
    carrying: false,
  };
}

export function updatePlayer(
  player: PlayerState,
  input: InputState,
  dt: number,
  colliders: THREE.Box3[],
) {
  const mv = RULES.movement;
  const cam = RULES.camera;
  const vit = RULES.vitals;

  // --- Mouse look ---
  const { dx, dy } = consumeMouseDelta(input);
  player.yaw -= dx * cam.lookSensitivity * 0.1;
  player.pitch -= dy * cam.lookSensitivity * 0.1;
  player.pitch = Math.max(cam.minPitch, Math.min(cam.maxPitch, player.pitch));

  // --- Sprint / stamina ---
  const wantSprint = input.sprint && !player.vitals.exhausted;
  let speed: number;
  if (wantSprint && (input.forward || input.backward || input.left || input.right)) {
    speed = mv.sprintSpeed;
    player.vitals.stamina = Math.max(0, player.vitals.stamina - vit.sprintDrainPerSecond * dt);
    if (player.vitals.stamina <= vit.exhaustionThreshold) player.vitals.exhausted = true;
  } else {
    speed = mv.walkSpeed;
    player.vitals.stamina = Math.min(vit.maxStamina, player.vitals.stamina + vit.staminaRegenPerSecond * dt);
    if (player.vitals.stamina > 20) player.vitals.exhausted = false;
  }

  if (player.carrying) speed *= mv.carrySpeedMultiplierMax;

  // --- Build move direction ---
  const yawRad = THREE.MathUtils.degToRad(player.yaw);
  const forward = new THREE.Vector3(-Math.sin(yawRad), 0, -Math.cos(yawRad));
  const right = new THREE.Vector3(Math.cos(yawRad), 0, -Math.sin(yawRad));

  const wish = new THREE.Vector3();
  if (input.forward) wish.add(forward);
  if (input.backward) wish.sub(forward);
  if (input.right) wish.add(right);
  if (input.left) wish.sub(right);
  if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed);

  // --- Horizontal acceleration ---
  const accel = wish.lengthSq() > 0 ? mv.acceleration : mv.deceleration;
  player.velocity.x += (wish.x - player.velocity.x) * Math.min(1, accel * dt);
  player.velocity.z += (wish.z - player.velocity.z) * Math.min(1, accel * dt);

  // --- Gravity & jump ---
  if (player.onGround && input.jump) {
    player.velocity.y = Math.sqrt(-2 * mv.gravity * mv.jumpHeight);
    player.onGround = false;
    player.landingKickTimer = 0;
  }
  if (!player.onGround) {
    player.velocity.y += mv.gravity * dt;
  }

  // --- Stumble timer ---
  if (player.stumbleCooldown > 0) player.stumbleCooldown -= dt;
  if (player.stumbling) {
    player.stumbleTimer -= dt;
    if (player.stumbleTimer <= 0) player.stumbling = false;
  }

  // --- Move & basic collision (floor) ---
  const prevY = player.position.y;
  player.position.addScaledVector(player.velocity, dt);

  const floorY = RULES.movement.controllerHeight / 2;
  if (player.position.y <= floorY) {
    const wasAirborne = !player.onGround;
    player.position.y = floorY;
    if (wasAirborne && player.velocity.y < -2) {
      player.landingKickTimer = cam.landingKick;
    }
    player.velocity.y = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  // --- Simple box colliders ---
  const r = mv.controllerRadius;
  const h = mv.controllerHeight;
  const pbox = new THREE.Box3(
    player.position.clone().addScalar(-r).setComponent(1, player.position.y - h / 2),
    player.position.clone().addScalar(r).setComponent(1, player.position.y + h / 2),
  );
  for (const box of colliders) {
    if (pbox.intersectsBox(box)) {
      const center = new THREE.Vector3();
      box.getCenter(center);
      const push = player.position.clone().sub(center);
      push.y = 0;
      if (push.lengthSq() > 0) push.normalize().multiplyScalar(r + 0.05);
      player.position.x = center.x + push.x;
      player.position.z = center.z + push.z;
      player.velocity.x = 0;
      player.velocity.z = 0;
    }
  }

  // --- Bob ---
  const hSpeed = Math.sqrt(player.velocity.x ** 2 + player.velocity.z ** 2);
  if (player.onGround && hSpeed > 0.5) {
    const freq = hSpeed > mv.walkSpeed + 0.5 ? cam.sprintBobFrequency : cam.walkBobFrequency;
    player.bobTime += freq * dt;
  } else {
    player.bobTime *= 0.9;
  }

  if (player.landingKickTimer > 0) player.landingKickTimer -= dt;
}

export function getCameraMatrix(player: PlayerState): THREE.Matrix4 {
  const cam = RULES.camera;
  const hSpeed = Math.sqrt(player.velocity.x ** 2 + player.velocity.z ** 2);
  const isSprinting = hSpeed > RULES.movement.walkSpeed + 0.2;
  const bobAmp = isSprinting ? cam.sprintBobAmplitude : cam.walkBobAmplitude;

  const bobY = Math.sin(player.bobTime) * bobAmp * (player.onGround ? 1 : 0);
  const bobX = Math.cos(player.bobTime * 0.5) * bobAmp * 0.5 * (player.onGround ? 1 : 0);

  const eye = player.position.clone();
  eye.y += cam.eyeHeight - RULES.movement.controllerHeight / 2;
  eye.y += bobY + (player.landingKickTimer > 0 ? -player.landingKickTimer * 2 : 0);
  eye.x += bobX;

  const stumbleRoll = player.stumbling
    ? Math.sin(player.stumbleTimer * Math.PI * 2) * cam.stumbleRoll
    : 0;
  const stumblePitch = player.stumbling ? cam.stumblePitch : 0;

  const yawQ = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(player.yaw),
  );
  const pitchQ = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(player.pitch + stumblePitch),
  );
  const rollQ = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(stumbleRoll),
  );

  const mat = new THREE.Matrix4();
  mat.compose(eye, yawQ.multiply(pitchQ).multiply(rollQ), new THREE.Vector3(1, 1, 1));
  return mat;
}
