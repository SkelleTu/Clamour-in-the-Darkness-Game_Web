import { consumeMouseDelta, type InputState } from './input';
import { RULES } from './rules';

export type Vec3State = { x: number; y: number; z: number };

export type Vitals = {
  health: number;
  stamina: number;
  exhausted: boolean;
};

export type PlayerState = {
  position: Vec3State;
  velocity: Vec3State;
  yaw: number;
  pitch: number;
  onGround: boolean;
  vitals: Vitals;
  stumbling: boolean;
  stumbleCooldown: number;
  stumbleTimer: number;
  bobTime: number;
  landingKickTimer: number;
  carrying: boolean;
};

export type BoxCollider = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export function createPlayerState(): PlayerState {
  return {
    position: {
      x: 0,
      y: RULES.movement.controllerHeight / 2,
      z: 0,
    },
    velocity: { x: 0, y: 0, z: 0 },
    yaw: 0,
    pitch: 0,
    onGround: false,
    vitals: {
      health: RULES.vitals.maxHealth,
      stamina: RULES.vitals.maxStamina,
      exhausted: false,
    },
    stumbling: false,
    stumbleCooldown: 0,
    stumbleTimer: 0,
    bobTime: 0,
    landingKickTimer: 0,
    carrying: false,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lengthXZ(x: number, z: number) {
  return Math.hypot(x, z);
}

function normalizeXZ(x: number, z: number) {
  const length = Math.hypot(x, z);
  return length > 0 ? { x: x / length, z: z / length } : { x: 0, z: 0 };
}

function resolveCollisions(
  player: PlayerState,
  colliders: BoxCollider[],
) {
  const radius = RULES.movement.controllerRadius;

  for (const box of colliders) {
    const closestX = clamp(player.position.x, box.minX, box.maxX);
    const closestZ = clamp(player.position.z, box.minZ, box.maxZ);
    const dx = player.position.x - closestX;
    const dz = player.position.z - closestZ;
    const distance = Math.hypot(dx, dz);

    if (distance >= radius) continue;

    if (distance > 0.0001) {
      const push = radius - distance;
      player.position.x += (dx / distance) * push;
      player.position.z += (dz / distance) * push;
    } else {
      const left = Math.abs(player.position.x - box.minX);
      const right = Math.abs(box.maxX - player.position.x);
      const top = Math.abs(player.position.z - box.minZ);
      const bottom = Math.abs(box.maxZ - player.position.z);
      const minimum = Math.min(left, right, top, bottom);

      if (minimum === left) player.position.x = box.minX - radius;
      else if (minimum === right) player.position.x = box.maxX + radius;
      else if (minimum === top) player.position.z = box.minZ - radius;
      else player.position.z = box.maxZ + radius;
    }

    player.velocity.x = 0;
    player.velocity.z = 0;
  }
}

export function updatePlayer(
  player: PlayerState,
  input: InputState,
  dt: number,
  colliders: BoxCollider[],
) {
  const mv = RULES.movement;
  const cam = RULES.camera;
  const vit = RULES.vitals;

  const { dx, dy } = consumeMouseDelta(input);
  player.yaw -= dx * cam.lookSensitivity * 0.1;
  player.pitch -= dy * cam.lookSensitivity * 0.1;
  player.pitch = clamp(player.pitch, cam.minPitch, cam.maxPitch);

  const wantsSprint = input.sprint && !player.vitals.exhausted;
  let speed = mv.walkSpeed;

  if (wantsSprint && (input.forward || input.backward || input.left || input.right)) {
    speed = mv.sprintSpeed;
    player.vitals.stamina = Math.max(
      0,
      player.vitals.stamina - vit.sprintDrainPerSecond * dt,
    );
    if (player.vitals.stamina <= vit.exhaustionThreshold) {
      player.vitals.exhausted = true;
    }
  } else {
    player.vitals.stamina = Math.min(
      vit.maxStamina,
      player.vitals.stamina + vit.staminaRegenPerSecond * dt,
    );
    if (player.vitals.stamina > 20) {
      player.vitals.exhausted = false;
    }
  }

  if (player.carrying) speed *= mv.carrySpeedMultiplierMax;

  const yawRad = (player.yaw * Math.PI) / 180;
  const forward = {
    x: -Math.sin(yawRad),
    z: -Math.cos(yawRad),
  };
  const right = {
    x: Math.cos(yawRad),
    z: -Math.sin(yawRad),
  };

  let wishX = 0;
  let wishZ = 0;

  if (input.forward) {
    wishX += forward.x;
    wishZ += forward.z;
  }
  if (input.backward) {
    wishX -= forward.x;
    wishZ -= forward.z;
  }
  if (input.right) {
    wishX += right.x;
    wishZ += right.z;
  }
  if (input.left) {
    wishX -= right.x;
    wishZ -= right.z;
  }

  const wish = normalizeXZ(wishX, wishZ);
  wishX = wish.x * speed;
  wishZ = wish.z * speed;

  const horizontalSpeed = lengthXZ(player.velocity.x, player.velocity.z);
  const acceleration =
    wishX !== 0 || wishZ !== 0
      ? mv.acceleration
      : mv.deceleration;

  const blend = Math.min(1, acceleration * dt);
  player.velocity.x += (wishX - player.velocity.x) * blend;
  player.velocity.z += (wishZ - player.velocity.z) * blend;

  if (player.onGround && input.jump) {
    player.velocity.y = Math.sqrt(-2 * mv.gravity * mv.jumpHeight);
    player.onGround = false;
    player.landingKickTimer = 0;
  }

  if (!player.onGround) {
    player.velocity.y += mv.gravity * dt;
  }

  if (player.stumbleCooldown > 0) {
    player.stumbleCooldown -= dt;
  }

  if (player.stumbling) {
    player.stumbleTimer -= dt;
    if (player.stumbleTimer <= 0) player.stumbling = false;
  }

  player.position.x += player.velocity.x * dt;
  player.position.y += player.velocity.y * dt;
  player.position.z += player.velocity.z * dt;

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

  resolveCollisions(player, colliders);

  const newHorizontalSpeed = lengthXZ(player.velocity.x, player.velocity.z);
  if (player.onGround && newHorizontalSpeed > 0.5) {
    const frequency =
      newHorizontalSpeed > mv.walkSpeed + 0.5
        ? cam.sprintBobFrequency
        : cam.walkBobFrequency;
    player.bobTime += frequency * dt;
  } else {
    player.bobTime *= 0.9;
  }

  if (player.landingKickTimer > 0) {
    player.landingKickTimer -= dt;
  }

  return {
    horizontalSpeed,
    newHorizontalSpeed,
  };
}

export type CameraPose = {
  x: number;
  y: number;
  z: number;
  pitch: number;
  yaw: number;
  roll: number;
};

export function getCameraPose(player: PlayerState): CameraPose {
  const cam = RULES.camera;
  const hSpeed = lengthXZ(player.velocity.x, player.velocity.z);
  const isSprinting = hSpeed > RULES.movement.walkSpeed + 0.2;
  const bobAmplitude = isSprinting
    ? cam.sprintBobAmplitude
    : cam.walkBobAmplitude;

  const bobY =
    Math.sin(player.bobTime) *
    bobAmplitude *
    (player.onGround ? 1 : 0);

  const bobX =
    Math.cos(player.bobTime * 0.5) *
    bobAmplitude *
    0.5 *
    (player.onGround ? 1 : 0);

  const y =
    player.position.y +
    cam.eyeHeight -
    RULES.movement.controllerHeight / 2 +
    bobY +
    (player.landingKickTimer > 0
      ? -player.landingKickTimer * 2
      : 0);

  const roll = player.stumbling
    ? Math.sin(player.stumbleTimer * Math.PI * 2) * cam.stumbleRoll
    : 0;

  const pitch =
    player.pitch +
    (player.stumbling ? cam.stumblePitch : 0);

  return {
    x: player.position.x + bobX,
    y,
    z: player.position.z,
    pitch,
    yaw: player.yaw,
    roll,
  };
}
