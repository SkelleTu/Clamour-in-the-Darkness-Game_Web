import { Vec3 } from 'playcanvas';
import { consumeMouseDelta } from './input.mjs';

const DEFAULT_RULES = {
    walkSpeed: 3.8,
    sprintSpeed: 6.2,
    acceleration: 18,
    deceleration: 22,
    gravity: -24,
    jumpHeight: 1.45,
    controllerHeight: 1.8,
    lookSensitivity: 0.075,
    minPitch: -78,
    maxPitch: 82,
    maxHealth: 100,
    maxStamina: 100,
    sprintDrainPerSecond: 20,
    staminaRegenPerSecond: 12,
    exhaustionThreshold: 1
};

export function createPlayerState(rules = DEFAULT_RULES) {
    return {
        position: new Vec3(0, rules.controllerHeight / 2, 0),
        velocity: new Vec3(),
        yaw: 0,
        pitch: 0,
        onGround: true,
        health: rules.maxHealth,
        stamina: rules.maxStamina,
        exhausted: false,
        bobTime: 0
    };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lengthXZ(x, z) {
    return Math.hypot(x, z);
}

function normalizeXZ(x, z) {
    const length = Math.hypot(x, z);
    return length > 0 ? { x: x / length, z: z / length } : { x: 0, z: 0 };
}

export function updatePlayer(player, input, dt, rules = DEFAULT_RULES) {
    const { dx, dy } = consumeMouseDelta(input);
    player.yaw -= dx * rules.lookSensitivity * 0.1;
    player.pitch = clamp(player.pitch - dy * rules.lookSensitivity * 0.1, rules.minPitch, rules.maxPitch);

    const moving = input.forward || input.backward || input.left || input.right;
    const sprinting = input.sprint && moving && !player.exhausted;
    const speed = sprinting ? rules.sprintSpeed : rules.walkSpeed;

    if (sprinting) {
        player.stamina = Math.max(0, player.stamina - rules.sprintDrainPerSecond * dt);
        if (player.stamina <= rules.exhaustionThreshold) player.exhausted = true;
    } else {
        player.stamina = Math.min(rules.maxStamina, player.stamina + rules.staminaRegenPerSecond * dt);
        if (player.stamina > 20) player.exhausted = false;
    }

    const yaw = player.yaw * Math.PI / 180;
    const forward = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
    const right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
    let wishX = 0;
    let wishZ = 0;

    if (input.forward) { wishX += forward.x; wishZ += forward.z; }
    if (input.backward) { wishX -= forward.x; wishZ -= forward.z; }
    if (input.right) { wishX += right.x; wishZ += right.z; }
    if (input.left) { wishX -= right.x; wishZ -= right.z; }

    const wish = normalizeXZ(wishX, wishZ);
    wishX = wish.x * speed;
    wishZ = wish.z * speed;

    const accel = moving ? rules.acceleration : rules.deceleration;
    const blend = Math.min(1, accel * dt);
    player.velocity.x += (wishX - player.velocity.x) * blend;
    player.velocity.z += (wishZ - player.velocity.z) * blend;

    if (player.onGround && input.jump) {
        player.velocity.y = Math.sqrt(-2 * rules.gravity * rules.jumpHeight);
        player.onGround = false;
    }

    if (!player.onGround) player.velocity.y += rules.gravity * dt;

    player.position.x += player.velocity.x * dt;
    player.position.y += player.velocity.y * dt;
    player.position.z += player.velocity.z * dt;

    const floorY = rules.controllerHeight / 2;
    if (player.position.y <= floorY) {
        player.position.y = floorY;
        player.velocity.y = 0;
        player.onGround = true;
    } else {
        player.onGround = false;
    }

    const horizontalSpeed = lengthXZ(player.velocity.x, player.velocity.z);
    if (player.onGround && horizontalSpeed > 0.5) {
        player.bobTime += (sprinting ? 10.5 : 7) * dt;
    }

    return { horizontalSpeed, sprinting };
}

export function applyPlayerToEntity(playerEntity, player, cameraEntity, eyeHeight = 1.62) {
    playerEntity.setPosition(player.position);
    playerEntity.setEulerAngles(0, player.yaw, 0);

    cameraEntity.setPosition(player.position.x, player.position.y + eyeHeight - 0.9, player.position.z);
    cameraEntity.setEulerAngles(player.pitch, player.yaw, 0);
}
