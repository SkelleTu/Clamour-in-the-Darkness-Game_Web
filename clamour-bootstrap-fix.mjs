window.RULES = {
  game: 'Clamour in the Darkness',
  version: 'playcanvas-runtime-1',
  world: {
    defaultLatitude: -22.3572,
    defaultLongitude: -47.3841,
    city: 'Araras',
    country: 'BR',
  },
  movement: {
    walkSpeed: 3.8,
    sprintSpeed: 6.2,
    acceleration: 18.0,
    deceleration: 22.0,
    rotationSpeed: 14.0,
    gravity: -24.0,
    jumpHeight: 1.45,
    slopeLimit: 48.0,
    controllerRadius: 0.32,
    controllerHeight: 1.8,
    stepOffset: 0.22,
    skinWidth: 0.04,
    carrySpeedMultiplierMin: 0.1,
    carrySpeedMultiplierMax: 1.0,
  },
  stumble: {
    enabled: true,
    minimumObstacleHeight: 0.16,
    maxObstacleHeight: 0.62,
    cooldownSeconds: 1.25,
    durationSeconds: 0.45,
    speedThreshold: 2.4,
    speedLoss: 0.55,
    verticalImpulse: 1.5,
  },
  camera: {
    eyeHeight: 1.62,
    lookSensitivity: 0.075,
    minPitch: -78,
    maxPitch: 82,
    walkBobFrequency: 7,
    sprintBobFrequency: 10.5,
    walkBobAmplitude: 0.018,
    sprintBobAmplitude: 0.035,
    landingKick: 0.055,
    stumbleRoll: 5.5,
    stumblePitch: 4,
  },
  vitals: {
    maxHealth: 100,
    maxStamina: 100,
    sprintDrainPerSecond: 20,
    staminaRegenPerSecond: 12,
    exhaustionThreshold: 1,
  },
  interaction: {
    pickupRange: 2.2,
  },
  streetView: {
    passive: true,
    metadataRadiusMeters: 70,
    imageWidth: 1024,
    imageHeight: 640,
    fov: 96,
    requestDebounceMs: 1200,
  },
  horror: {
    manifestationSeconds: 2.6,
    distanceMeters: 7,
    sharedEventPollingMs: 1200,
  },
  persistence: {
    autosaveSeconds: 3,
    restoreLastPosition: true,
    initialSpawnFromHome: true,
  },
  network: {
    playerDirectoryLimit: 64,
    eventLimit: 100,
    heartbeatMs: 500,
  },
};

window.createInputState = function createInputState() {
  return {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
    interact: false,
    spawnObject: false,
    triggerHorror: false,
    mouseX: 0,
    mouseY: 0,
    pointerLocked: false,
    touchLook: false,
    escapePressed: false,
  };
};

window.isTouchDevice = function isTouchDevice() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  );
};

window.bindInput = function bindInput(state, canvas, onInteract, onHorror) {
  const isTouch = window.isTouchDevice();
  const keyMap = {
    KeyW: 'forward',
    KeyS: 'backward',
    KeyA: 'left',
    KeyD: 'right',
    ShiftLeft: 'sprint',
    ShiftRight: 'sprint',
    Space: 'jump',
    KeyE: 'interact',
    KeyF: 'spawnObject',
    KeyH: 'triggerHorror',
    Escape: 'escapePressed',
  };

  const pressedKeys = new Set();
  function onKey(event, down) {
    if (!down && event.code === 'Escape') {
      state.escapePressed = false;
      pressedKeys.delete('Escape');
      return;
    }
    const key = keyMap[event.code];
    if (key) state[key] = down;
    if (down && event.code === 'Escape') {
      state.escapePressed = !pressedKeys.has('Escape');
      pressedKeys.add('Escape');
    }
    if (event.code === 'Space' && down && !isInputFocused()) {
      event.preventDefault();
    }
    if (event.code === 'KeyE' && down && !isInputFocused()) onInteract?.();
    if (event.code === 'KeyH' && down && !isInputFocused()) onHorror?.();
  }

  function onKeyDown(event) { onKey(event, true); }
  function onKeyUp(event) { onKey(event, false); }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  function onMouseMove(event) {
    if (state.pointerLocked) {
      state.mouseX += event.movementX;
      state.mouseY += event.movementY;
    }
  }

  function onPointerLockChange() {
    state.pointerLocked = document.pointerLockElement === canvas;
  }

  function onCanvasClick() {
    if (!isTouch && !state.pointerLocked && !isUiVisible()) {
      canvas.requestPointerLock();
    }
  }

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
};

window.consumeMouseDelta = function consumeMouseDelta(state) {
  const dx = state.mouseX;
  const dy = state.mouseY;
  state.mouseX = 0;
  state.mouseY = 0;
  return { dx, dy };
};

function isUiVisible() {
  const root = document.getElementById('clamour-ui-root');
  if (!root) return false;
  const visible = root.querySelector(
    '.modal[style*="display: flex"], .modal[style*="display:flex"], .overlay[style*="display: flex"], .overlay[style*="display:flex"]'
  );
  return visible !== null;
}

function isInputFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (el.isContentEditable) return true;
  return false;
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

function resolveCollisions(player, colliders) {
  const radius = window.RULES.movement.controllerRadius;
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
      const right = Math.abs(player.position.x - box.maxX);
      const top = Math.abs(player.position.z - box.minZ);
      const bottom = Math.abs(player.position.z - box.maxZ);
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

window.createPlayerState = function createPlayerState() {
  return {
    position: { x: 0, y: window.RULES.movement.controllerHeight / 2, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    yaw: 0,
    pitch: 0,
    onGround: false,
    vitals: {
      health: window.RULES.vitals.maxHealth,
      stamina: window.RULES.vitals.maxStamina,
      exhausted: false,
    },
    stumbling: false,
    stumbleCooldown: 0,
    stumbleTimer: 0,
    bobTime: 0,
    landingKickTimer: 0,
    carrying: false,
  };
};

window.updatePlayer = function updatePlayer(player, input, dt, colliders) {
  const mv = window.RULES.movement;
  const cam = window.RULES.camera;
  const vit = window.RULES.vitals;

  const dx = input.mouseX;
  const dy = input.mouseY;
  player.yaw -= dx * cam.lookSensitivity * 0.1;
  player.pitch -= dy * cam.lookSensitivity * 0.1;
  player.pitch = clamp(player.pitch, cam.minPitch, cam.maxPitch);

  const wantsSprint = input.sprint && !player.vitals.exhausted;
  let speed = mv.walkSpeed;
  if (wantsSprint && (input.forward || input.backward || input.left || input.right)) {
    speed = mv.sprintSpeed;
    player.vitals.stamina = Math.max(0, player.vitals.stamina - vit.sprintDrainPerSecond * dt);
    if (player.vitals.stamina <= vit.exhaustionThreshold) player.vitals.exhausted = true;
  } else {
    player.vitals.stamina = Math.min(vit.maxStamina, player.vitals.stamina + vit.staminaRegenPerSecond * dt);
    if (player.vitals.stamina > 20) player.vitals.exhausted = false;
  }
  if (player.carrying) speed *= mv.carrySpeedMultiplierMax;

  const yawRad = (player.yaw * Math.PI) / 180;
  const forward = { x: -Math.sin(yawRad), z: -Math.cos(yawRad) };
  const right = { x: Math.cos(yawRad), z: -Math.sin(yawRad) };

  let wishX = 0;
  let wishZ = 0;
  if (input.forward) { wishX += forward.x; wishZ += forward.z; }
  if (input.backward) { wishX -= forward.x; wishZ -= forward.z; }
  if (input.right) { wishX += right.x; wishZ += right.z; }
  if (input.left) { wishX -= right.x; wishZ -= right.z; }

  const wish = normalizeXZ(wishX, wishZ);
  wishX = wish.x * speed;
  wishZ = wish.z * speed;

  const horizontalSpeed = lengthXZ(player.velocity.x, player.velocity.z);
  const acceleration = (wishX !== 0 || wishZ !== 0) ? mv.acceleration : mv.deceleration;
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

  if (player.stumbleCooldown > 0) player.stumbleCooldown -= dt;
  if (player.stumbling) {
    player.stumbleTimer -= dt;
    if (player.stumbleTimer <= 0) player.stumbling = false;
  }

  player.position.x += player.velocity.x * dt;
  player.position.y += player.velocity.y * dt;
  player.position.z += player.velocity.z * dt;

  const floorY = window.RULES.movement.controllerHeight / 2;
  if (player.position.y <= floorY) {
    const wasAirborne = !player.onGround;
    player.position.y = floorY;
    if (wasAirborne && player.velocity.y < -2) player.landingKickTimer = cam.landingKick;
    player.velocity.y = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  resolveCollisions(player, colliders);

  const newHorizontalSpeed = lengthXZ(player.velocity.x, player.velocity.z);
  if (player.onGround && newHorizontalSpeed > 0.5) {
    const frequency = newHorizontalSpeed > mv.walkSpeed + 0.5 ? cam.sprintBobFrequency : cam.walkBobFrequency;
    player.bobTime += frequency * dt;
  } else {
    player.bobTime *= 0.9;
  }
  if (player.landingKickTimer > 0) player.landingKickTimer -= dt;

  return { horizontalSpeed, newHorizontalSpeed };
};

window.getCameraPose = function getCameraPose(player) {
  const cam = window.RULES.camera;
  const hSpeed = lengthXZ(player.velocity.x, player.velocity.z);
  const isSprinting = hSpeed > window.RULES.movement.walkSpeed + 0.2;
  const bobAmplitude = isSprinting ? cam.sprintBobAmplitude : cam.walkBobAmplitude;
  const bobY = Math.sin(player.bobTime) * bobAmplitude * (player.onGround ? 1 : 0);
  const bobX = Math.cos(player.bobTime * 0.5) * bobAmplitude * 0.5 * (player.onGround ? 1 : 0);
  const y = player.position.y + cam.eyeHeight - window.RULES.movement.controllerHeight / 2 + bobY + (player.landingKickTimer > 0 ? -player.landingKickTimer * 2 : 0);
  const roll = player.stumbling ? Math.sin(player.stumbleTimer * Math.PI * 2) * cam.stumbleRoll : 0;
  const pitch = player.pitch + (player.stumbling ? cam.stumblePitch : 0);
  return { x: player.position.x + bobX, y, z: player.position.z, pitch, yaw: player.yaw, roll };
};

window.buildWorld = function buildWorld(app) {
  const objects = [];
  const colliders = [];
  const root = new pc.Entity('ClamourWorld');
  app.root.addChild(root);

  function material(color, roughness, emissive, emissiveIntensity) {
    const result = new pc.StandardMaterial();
    result.diffuse = color;
    result.roughness = roughness || 0.9;
    if (emissive) {
      result.emissive = emissive;
      result.emissiveIntensity = emissiveIntensity || 0;
    }
    result.update();
    return result;
  }

  function addBox(parent, id, x, y, z, sx, sy, sz, mat, collider) {
    const entity = new pc.Entity(id);
    entity.addComponent('render', { type: 'box' });
    entity.setLocalPosition(x, y, z);
    entity.setLocalScale(sx, sy, sz);
    entity.render.material = mat;
    parent.addChild(entity);
    return { entity, collider, id };
  }

  const groundMat = material(new pc.Color(0.08, 0.09, 0.12));
  const buildingMat = material(new pc.Color(0.11, 0.12, 0.15));
  const sidewalkMat = material(new pc.Color(0.16, 0.16, 0.19));
  const lampMat = material(new pc.Color(0.18, 0.18, 0.21));
  const binMat = material(new pc.Color(0.12, 0.18, 0.14));
  const windowMat = material(new pc.Color(0.06, 0.09, 0.13), 0.8, new pc.Color(0.03, 0.08, 0.15), 0.7);

  objects.push(addBox(root, 'Ground', 0, -0.04, 0, 200, 0.08, 200, groundMat));

  for (const side of [-1, 1]) {
    objects.push(addBox(root, `Sidewalk_${side > 0 ? 'R' : 'L'}`, side * 8, 0.03, 0, 3, 0.06, 200, sidewalkMat));
  }

  for (const side of [-1, 1]) {
    for (let index = -5; index <= 5; index++) {
      const width = 6 + ((index + 6) % 5);
      const height = 7 + ((index + 11) % 14);
      const depth = 6 + ((index + 3) % 4);
      const z = index * 14;
      const x = side < 0 ? -12 - depth / 2 - 1 : 12 + depth / 2 + 1;
      const collider = { minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2 };
      const building = addBox(root, `BLDG_Block_${side}_${index}`, x, height / 2, z, width, height, depth, buildingMat, collider);
      objects.push(building);
      colliders.push(collider);
      const rows = Math.max(1, Math.floor(height / 2.5));
      const cols = Math.max(1, Math.floor(width / 1.8));
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const window = new pc.Entity(`WINDOW_${side}_${index}_${row}_${col}`);
          window.addComponent('render', { type: 'box' });
          window.setLocalScale(0.6, 0.9, 0.04);
          window.setLocalPosition(side < 0 ? x + width / 2 + 0.02 : x - width / 2 - 0.02, 1.5 + row * 2.5, z - depth / 2 + 0.9 + col * 1.8);
          window.setLocalEulerAngles(0, side < 0 ? 90 : -90, 0);
          window.render.material = windowMat;
          root.addChild(window);
        }
      }
    }
  }

  for (let index = -4; index <= 4; index++) {
    for (const [side, offset] of [[-7, 0], [7, 9]]) {
      const lamp = new pc.Entity(`LAMP_${index}_${side}`);
      lamp.addComponent('render', { type: 'cylinder' });
      lamp.setLocalScale(0.08, 4.5, 0.08);
      lamp.setLocalPosition(side, 2.25, index * 18 + offset);
      lamp.render.material = lampMat;
      root.addChild(lamp);
      const light = new pc.Entity(`LAMP_LIGHT_${index}_${side}`);
      light.addComponent('light', { type: 'omni', color: new pc.Color(1, 0.92, 0.7), intensity: 1.4, range: 14 });
      light.setLocalPosition(side, 4.3, index * 18 + offset);
      root.addChild(light);
    }
  }

  for (let index = -3; index <= 3; index++) {
    const z = index * 15;
    const x = -6.5;
    const collider = { minX: x - 0.3, maxX: x + 0.3, minZ: z - 0.3, maxZ: z + 0.3 };
    const bin = addBox(root, `PROP_Bin_${index}`, x, 0.45, z, 0.5, 0.9, 0.5, binMat, collider);
    objects.push(bin);
    colliders.push(collider);
  }

  return { root, objects, colliders };
};

window.destroyWorld = function destroyWorld(world) {
  world.root.destroy();
};

window.spawnTestObject = function spawnTestObject(app, playerPos) {
  const entity = new pc.Entity('SpawnedObject');
  entity.addComponent('render', { type: 'box' });
  const mat = new pc.StandardMaterial();
  mat.diffuse = new pc.Color(0.8, 0.27, 0.13);
  mat.emissive = new pc.Color(0.15, 0.04, 0.02);
  mat.emissiveIntensity = 0.4;
  mat.update();
  entity.render.material = mat;
  const angle = (window.__clamourBootstrap?.player?.yaw || 0) * Math.PI / 180;
  entity.setPosition(
    playerPos.x + Math.cos(angle) * 1.5,
    0.2,
    playerPos.z + Math.sin(angle) * 1.5
  );
  entity.setLocalScale(0.4, 0.4, 0.4);
  app.root.addChild(entity);
  return entity;
};

window.broadcastHorrorEvent = function broadcastHorrorEvent(_playerId, _x, _y, _z) {
  // Event transport will be wired through the multiplayer API.
};

window.createHorrorMaterial = function createHorrorMaterial() {
  const mat = new pc.StandardMaterial();
  mat.diffuse = new pc.Color(0.8, 0, 0.13);
  mat.emissive = new pc.Color(0.4, 0, 0.04);
  mat.emissiveIntensity = 1.5;
  mat.opacity = 0.85;
  mat.blendType = pc.BLEND_NORMAL;
  mat.update();
  return mat;
};

window.spawnHorrorEvent = function spawnHorrorEvent(app, playerPos) {
  const angle = Math.random() * Math.PI * 2;
  const distance = window.RULES.horror.distanceMeters;
  const position = { x: playerPos.x + Math.cos(angle) * distance, y: 1.1, z: playerPos.z + Math.sin(angle) * distance };
  const entity = new pc.Entity(`HORROR_${Math.random().toString(36).slice(2)}`);
  entity.addComponent('render', { type: 'cone' });
  entity.setPosition(position.x, position.y, position.z);
  entity.setLocalScale(0.01, 0.01, 0.01);
  entity.render.material = window.createHorrorMaterial();
  app.root.addChild(entity);
  const light = new pc.Entity('ManifestationLight');
  light.addComponent('light', { type: 'omni', color: new pc.Color(1, 0.1, 0.1), intensity: 2.5, range: 8 });
  entity.addChild(light);
  return { id: entity.name, position, entity, light, timer: window.RULES.horror.manifestationSeconds, fading: false };
};

window.updateHorrorEvents = function updateHorrorEvents(events, dt) {
  const totalDuration = window.RULES.horror.manifestationSeconds;
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    event.timer -= dt;
    const progress = 1 - event.timer / totalDuration;
    if (!event.fading) {
      const scale = Math.min(1, progress * 3);
      event.entity.setLocalScale(scale, scale, scale);
      event.entity.rotate(0, dt * 120, 0);
      if (event.entity.render?.material) {
        const mat = event.entity.render.material;
        mat.opacity = Math.min(0.85, scale);
        mat.update();
      }
    }
    if (event.timer <= 0) {
      event.fading = true;
      if (event.entity.render?.material) {
        const mat = event.entity.render.material;
        mat.opacity = Math.max(0, mat.opacity - dt * 2);
        mat.update();
        if (mat.opacity <= 0) {
          event.entity.destroy();
          events.splice(i, 1);
        }
      } else {
        event.entity.destroy();
        events.splice(i, 1);
      }
    }
  }
};

window.createStreetViewEnvironment = function createStreetViewEnvironment(canvas, metadata) {
  const parent = canvas.parentElement;
  if (!parent) throw new Error('PlayCanvas canvas parent not found.');

  const element = document.createElement('div');
  element.dataset.clamourStreetView = 'true';
  Object.assign(element.style, {
    position: 'absolute',
    inset: '0',
    zIndex: '0',
    pointerEvents: 'none',
    backgroundColor: '#05060a',
    backgroundPosition: 'center',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
  });

  canvas.style.position = 'absolute';
  canvas.style.zIndex = '1';
  canvas.style.background = 'transparent';

  parent.insertBefore(element, canvas);

  let currentObjectUrl = null;
  let requestId = 0;
  let attribution = metadata.copyright;

  function getBaseUrl() {
    if (typeof window.__clamourNetwork?.getUniversalServerUrl === 'function') {
      return window.__clamourNetwork.getUniversalServerUrl();
    }
    return String(window.CLAMOUR_US_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
  }

  async function load(nextMetadata, heading, pitch) {
    const serial = ++requestId;
    const params = new URLSearchParams({
      heading: String(heading),
      pitch: String(pitch ?? 0),
      fov: '96',
      width: '1024',
      height: '640',
    });
    if (nextMetadata.pano) {
      params.set('pano', nextMetadata.pano);
    }
    params.set('lat', String(nextMetadata.location.lat));
    params.set('lng', String(nextMetadata.location.lng));

    const url = `${getBaseUrl()}/api/game/streetview/image?${params.toString()}`;
    const response = await fetch(url, { headers: { Accept: 'image/*' } });
    if (!response.ok) throw new Error(`Street View image request failed: HTTP ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.decoding = 'async';
    image.src = objectUrl;
    await image.decode();
    if (serial !== requestId) { URL.revokeObjectURL(objectUrl); return; }
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = objectUrl;
    element.style.backgroundImage = `url("${objectUrl}")`;
    attribution = nextMetadata.copyright;
  }

  void load(metadata, 0, 0).catch(() => { element.style.backgroundImage = ''; });

  return {
    get attribution() { return attribution; },
    refresh(nextMetadata, heading, pitch) {
      return load(nextMetadata, heading, pitch);
    },
    dispose() {
      requestId += 1;
      if (currentObjectUrl) { URL.revokeObjectURL(currentObjectUrl); currentObjectUrl = null; }
      element.remove();
    },
  };
};

function getBaseUrl() {
  const candidates = [
    typeof window.CLAMOUR_US_URL === 'string' ? window.CLAMOUR_US_URL : null,
    typeof window.__clamourNetworkUrl === 'string' ? window.__clamourNetworkUrl : null,
    typeof window.CLAMOUR_PUBLIC_URL === 'string' ? window.CLAMOUR_PUBLIC_URL : null,
    'http://127.0.0.1:3000',
  ];
  const url = candidates.find(Boolean) || 'http://127.0.0.1:3000';
  return String(url).replace(/\/$/, '');
}

function apiKey() {
  return String(window.CLAMOUR_API_KEY || '').trim() || undefined;
}

async function request(path, init = {}) {
  const url = `${getBaseUrl()}${path}`;
  const headers = new Headers(init.headers || {});
  const key = apiKey();
  if (key && !headers.has('x-api-key')) headers.set('x-api-key', key);
  const response = await fetch(url, { ...init, headers });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const message = typeof payload === 'object' && payload ? String(payload.error || `HTTP ${response.status}`) : `HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

async function register(username, password) {
  return request('/api/game/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

async function login(username, password) {
  return request('/api/game/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

async function validateSession() {
  const token = localStorage.getItem('clamour_auth_token');
  if (!token) return null;
  try {
    const result = await request('/api/game/auth/session', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return result;
  } catch {
    localStorage.removeItem('clamour_auth_token');
    localStorage.removeItem('clamour_player_id');
    localStorage.removeItem('clamour_username');
    return null;
  }
}

function persistAuth(session) {
  localStorage.setItem('clamour_auth_token', session.token);
  localStorage.setItem('clamour_player_id', session.playerId);
  localStorage.setItem('clamour_username', session.username);
}

function clearAuth() {
  localStorage.removeItem('clamour_auth_token');
  localStorage.removeItem('clamour_player_id');
  localStorage.removeItem('clamour_username');
}

async function getStreetViewMetadata(lat, lon) {
  const result = await request(`/api/game/streetview/metadata?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lon)}&radius=100`);
  return result.data;
}

async function geocodeAddress(address) {
  try {
    const response = await fetch(
      `${getBaseUrl()}/api/game/google/geocode?address=${encodeURIComponent(address)}&components=country:BR`,
      { headers: { Accept: 'application/json' } }
    );
    if (!response.ok) return null;
    const payload = await response.json();
    const location = payload?.results?.[0]?.geometry?.location;
    if (!location || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) return null;
    return { lat: Number(location.lat), lon: Number(location.lng) };
  } catch {
    return null;
  }
}

async function searchAddresses(query) {
  if (query.trim().length < 3) return [];
  try {
    const response = await fetch(
      `${getBaseUrl()}/api/game/google/geocode?address=${encodeURIComponent(query)}&components=country:BR|administrative_area:SP|locality=Araras`,
      { headers: { Accept: 'application/json' } }
    );
    if (!response.ok) return [];
    const payload = await response.json();
    const rows = Array.isArray(payload?.results) ? payload.results : [];
    const addr = String(query).toLowerCase();
    const filtered = rows.filter(item => {
      const formatted = String(item.formatted_address || '').toLowerCase();
      return formatted.includes('araras') && (formatted.includes(', sp') || formatted.includes('são paulo') || formatted.includes('brazil') || formatted.includes('brasil'));
    });
    const source = filtered.length > 0 ? filtered : rows;
    return source.slice(0, 5).map(item => ({
      displayName: item.formatted_address || '',
      lat: Number(item.geometry?.location?.lat || NaN),
      lon: Number(item.geometry?.location?.lng || NaN),
    })).filter(s => s.displayName && Number.isFinite(s.lat) && Number.isFinite(s.lon));
  } catch {
    return [];
  }
}

async function loadPlayerState(playerId) {
  try {
    const result = await request(`/api/game/player-state/${encodeURIComponent(playerId)}`);
    if (!result.found || !result.state) return null;
    return result.state;
  } catch {
    return null;
  }
}

async function savePlayerState(playerId, state) {
  await request(`/api/game/player-state/${encodeURIComponent(playerId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
}

window.__clamourNetwork = {
  getUniversalServerUrl,
  register,
  login,
  validateSession,
  persistAuth,
  clearAuth,
  getStreetViewMetadata,
  geocodeAddress,
  searchAddresses,
  loadPlayerState,
  savePlayerState,
};

class AuthManager {
  constructor() {
    this.session = null;
    this.listeners = [];
    this.boundOnSessionChange = this.onSessionChange.bind(this);
    window.addEventListener('clamour:auth:change', this.boundOnSessionChange);
  }

  _network() {
    return window.__clamourNetwork || {};
  }

  onSessionChange(event) {
    this.session = event.detail?.session || null;
    for (const fn of this.listeners) fn(this.session);
  }

  onChange(fn) {
    this.listeners.push(fn);
    fn(this.session);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  async tryRestore() {
    const { validateSession, persistAuth, clearAuth } = this._network();
    const session = await validateSession?.();
    if (session) {
      this.setSession(session);
    } else {
      this.clearSession();
    }
    return session;
  }

  setSession(session) {
    this.session = session;
    const { persistAuth } = this._network();
    persistAuth?.(session);
    window.dispatchEvent(new CustomEvent('clamour:auth:change', { detail: { session } }));
  }

  clearSession() {
    this.session = null;
    const { clearAuth } = this._network();
    clearAuth?.();
    window.dispatchEvent(new CustomEvent('clamour:auth:change', { detail: { session: null } }));
  }

  async register(username, password) {
    const { register } = this._network();
    const session = await register(username, password);
    this.setSession(session);
    return session;
  }

  async login(username, password) {
    const { login } = this._network();
    const session = await login(username, password);
    this.setSession(session);
    return session;
  }

  get playerId() {
    return this.session?.playerId || localStorage.getItem('clamour_player_id') || '';
  }

  get username() {
    return this.session?.username || localStorage.getItem('clamour_username') || '';
  }

  destroy() {
    window.removeEventListener('clamour:auth:change', this.boundOnSessionChange);
    this.listeners = [];
  }
}

window.AuthManager = AuthManager;

export class GameBootstrap extends pc.Script {
  static scriptName = 'game-bootstrap';

  static GAME_PHASES = {
    IDLE: 'idle',
    AUTH: 'auth',
    ADDRESS: 'address',
    LOADING: 'loading',
    ERROR: 'error',
    PLAYING: 'playing',
    PAUSED: 'paused',
    CHARACTER: 'character',
  };

  static UI_OVERLAYS = {
    AUTH: 'auth',
    ADDRESS: 'address',
    LOADING: 'loading',
    ERROR: 'error',
    PAUSE: 'pause',
    HUD: 'hud',
    CHARACTER_CREATION: 'character-creation',
  };

  static SCENE_OBJECTS = {
    CAMERA: 'ClamourCamera',
    AMBIENT_LIGHT: 'ClamourAmbientLight',
    MOON_LIGHT: 'ClamourMoonLight',
    PLAYER: 'ClamourPlayer',
  };

  initialize() {
    console.log('[Clamour] game-bootstrap initialize start');
    this.input = window.createInputState();
    this.player = window.createPlayerState();
    this.world = window.buildWorld(this.app);
    this.horrorEvents = [];
    this.saveTimer = 0;
    this.streetViewTimer = 0;
    this.lastStreetX = NaN;
    this.lastStreetZ = NaN;
    this.lastStreetYaw = NaN;
    this.streetRequestActive = false;
    this.jumpConsumed = false;
    this.horrorConsumed = false;
    this.spawnConsumed = false;
    this.spawnedObjects = [];
    this.playerEntity = null;
    this.streetView = null;
    this.callbacks = null;
    this.options = null;
    this.phase = GameBootstrap.GAME_PHASES.IDLE;
    this.authManager = null;
    this.address = '';
    this.homeLat = null;
    this.homeLon = null;
    this._ui = null;
    this._authMode = 'login';
    this._suggestions = [];
    this._selectedSuggestion = null;
    this._suggestionDebounce = null;
    this._lastAddress = '';
    this._authSuccess = '';
    this._paused = false;
    this._escapeHandled = false;
    this._weather = null;
    this._clockInterval = null;
    this._inventory = [];
    this._promptTimeout = null;
    this._pickups = [];
    this._initialized = false;
    this._streetPano = null;
    this._apiKey = '';

    const sceneCamera = this.app.root.findByName('Camera');
    if (sceneCamera) {
      sceneCamera.camera.enabled = false;
    }

    this.camera = new pc.Entity(GameBootstrap.SCENE_OBJECTS.CAMERA);
    this.camera.addComponent('camera', {
      clearColor: new pc.Color(0.02, 0.02, 0.04, 1),
      fov: window.RULES.streetView.fov,
      nearClip: 0.05,
      farClip: 2000,
    });
    this.app.root.addChild(this.camera);

    const ambient = new pc.Entity(GameBootstrap.SCENE_OBJECTS.AMBIENT_LIGHT);
    ambient.addComponent('light', { type: 'directional', color: new pc.Color(0.45, 0.5, 0.62), intensity: 0.35 });
    ambient.setEulerAngles(50, 25, 0);
    this.app.root.addChild(ambient);

    const moon = new pc.Entity(GameBootstrap.SCENE_OBJECTS.MOON_LIGHT);
    moon.addComponent('light', { type: 'directional', color: new pc.Color(0.54, 0.62, 0.82), intensity: 0.7, castShadows: true });
    moon.setEulerAngles(58, -35, 0);
    this.app.root.addChild(moon);

    this.playerEntity = new pc.Entity(GameBootstrap.SCENE_OBJECTS.PLAYER);
    this.playerEntity.addComponent('render', { type: 'capsule', castShadows: true });
    this.playerEntity.render.enabled = false;
    this.app.root.addChild(this.playerEntity);

    this.cleanupInput = window.bindInput(
      this.input,
      this.app.graphicsDevice.canvas,
      () => { this.input.interact = true; },
      () => { this.input.triggerHorror = true; }
    );

    this.authManager = new window.AuthManager();
    console.log('[Clamour] AuthManager created, trying restore');
    this.authManager.tryRestore().then(session => {
      console.log('[Clamour] tryRestore result', session ? 'session found' : 'no session');
      if (session) {
        this.showAddressPhase();
      } else {
        this.showAuthPhase();
      }
    }).catch(err => {
      console.error('[Clamour] tryRestore error', err);
    });

    window.__clamourBootstrap = this;
    console.log('[Clamour] __clamourBootstrap registered');
    this._initUi();
    this._startClock();
    console.log('[Clamour] game-bootstrap initialize done');
  }

  _startClock() {
    const update = () => {
      const el = this._ui?.clockEl;
      if (!el) return;
      const now = new Date();
      el.textContent = now.toLocaleTimeString('pt-BR');
    };
    update();
    this._clockInterval = setInterval(update, 1000);
  }

  _initUi() {
    const existing = document.getElementById('clamour-ui-root');
    if (existing) existing.remove();

    const root = document.createElement('div');
    root.id = 'clamour-ui-root';
    root.innerHTML = `
      <div id="${GameBootstrap.UI_OVERLAYS.AUTH}" class="modal" style="display:none;">
        <div class="panel">
          <p class="eyebrow">Universal World // Araras</p>
          <h1>Clamour</h1>
          <p id="auth-subtitle">Acesse ou crie sua conta para entrar na noite.</p>
          <div class="row">
            <input id="auth-username" type="text" placeholder="seu_usuario" autocomplete="username" maxlength="24" />
          </div>
          <div class="row">
            <input id="auth-password" type="password" placeholder="Senha" autocomplete="current-password" />
          </div>
          <div class="row">
            <input id="auth-confirm" type="password" placeholder="Confirmar senha" autocomplete="new-password" style="display:none;" />
          </div>
          <div id="auth-error" class="row" style="color:#ef4444;font-size:11px;display:none;"></div>
          <div id="auth-success" class="row" style="color:#34d399;font-size:11px;display:none;"></div>
          <div class="row">
            <button id="auth-submit">Entrar no mundo</button>
          </div>
          <div class="row" style="display:flex;gap:8px;">
            <button id="auth-mode-toggle" style="background:transparent;color:#a9abb2;border:1px solid rgba(255,255,255,.12);">Criar conta</button>
            <button id="auth-logout" style="background:transparent;color:#a9abb2;border:1px solid rgba(255,255,255,.12);display:none;">Sair</button>
          </div>
          <small>O mundo e o progresso sao persistidos pelo Universal Server.</small>
        </div>
      </div>

      <div id="${GameBootstrap.UI_OVERLAYS.ADDRESS}" class="modal" style="display:none;">
        <div class="panel">
          <p class="eyebrow">Universal World // Araras</p>
          <h1>Seu endereco</h1>
          <p>Informe um endereco em Araras, SP. O jogo vai te colocar neste local na primeira entrada.</p>
          <div class="row">
            <input id="address-input" type="text" placeholder="Rua XV de Novembro 123, Araras" autocomplete="off" />
          </div>
          <div id="address-suggestions" class="row" style="display:none;"></div>
          <div id="address-error" class="row" style="color:#ef4444;font-size:11px;display:none;"></div>
          <div class="row">
            <button id="address-submit">Entrar na Noite</button>
          </div>
        </div>
      </div>

      <div id="${GameBootstrap.UI_OVERLAYS.LOADING}" class="overlay" style="display:none;">
        <div class="panel" style="text-align:center;">
          <p style="font-size:11px;letter-spacing:.35em;text-transform:uppercase;opacity:.6;">Localizando a noite</p>
          <p style="margin-top:8px;font-size:12px;opacity:.4;">Encontrando a rua e o panorama mais proximo.</p>
        </div>
      </div>

      <div id="${GameBootstrap.UI_OVERLAYS.ERROR}" class="modal" style="display:none;">
        <div class="panel">
          <p id="error-message" style="color:#ef4444;font-size:12px;"></p>
          <div class="row" style="display:flex;gap:8px;">
            <button id="error-back">Voltar</button>
            <button id="error-retry">Tentar novamente</button>
          </div>
        </div>
      </div>

      <div id="${GameBootstrap.UI_OVERLAYS.PAUSE}" class="modal" style="display:none;">
        <div class="panel" style="text-align:center;">
          <h1 style="margin:2px 0 18px;font-size:24px;letter-spacing:.04em;">Menu</h1>
          <div class="row">
            <button id="pause-resume">Continuar</button>
          </div>
          <div class="row">
            <button id="pause-logout">Desconectar da conta</button>
          </div>
          <small style="display:block;margin-top:18px;opacity:.45;">Pressione ESC para alternar</small>
        </div>
      </div>

      <div id="${GameBootstrap.UI_OVERLAYS.HUD}" style="display:none;">
        <div class="topbar">
          <strong id="hud-address"></strong>
          <span id="hud-user"></span>
          <span id="status">conectando...</span>
          <span id="clock">--:--:--</span>
        </div>
        <div id="streetview" aria-label="Street View do mundo"></div>
        <div id="streetviewAttribution">Street View</div>
        <div id="crosshair" style="display:none;">+</div>
        <div class="vitals">
          <div class="meter"><span>HP</span><i id="hp-bar"></i></div>
          <div class="meter"><span>ST</span><i id="st-bar"></i></div>
        </div>
        <div id="weather"></div>
        <div id="inventory"></div>
        <div id="prompt"></div>
        <div id="mobileControls" class="mobile-only">
          <button id="lookToggle">olhar</button>
          <button id="jumpBtn">pular</button>
          <button id="interactBtn">interagir</button>
        </div>
        <button id="logout-btn" style="position:fixed;right:18px;top:14px;z-index:10;background:rgba(0,0,0,.45);color:#fff;border:1px solid rgba(255,255,255,.12);padding:6px 10px;border-radius:6px;font-size:10px;letter-spacing:.12em;cursor:pointer;">Sair</button>
      </div>

      <div id="${GameBootstrap.UI_OVERLAYS.CHARACTER_CREATION}" class="modal" style="display:none;">
        <div class="panel">
          <div class="eyebrow">CLAMOUR IN THE DARKNESS</div>
          <h1>Onde voce mora?</h1>
          <p>Na primeira entrada, informe o endereco da sua casa. O jogo começa ali. Depois disso, sua ultima posicao fica salva.</p>
          <input id="homeAddress" placeholder="Rua, numero, Araras - SP" autocomplete="street-address" />
          <div class="row"><button id="startBtn" type="button">Criar personagem e entrar</button></div>
          <small>Prototipo web nativo • mundo de Araras • Street View passivo</small>
        </div>
      </div>
    `;

    root.style.cssText = 'position:fixed;inset:0;z-index:50;pointer-events:none;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#e8e8ea;';
    document.body.appendChild(root);

    this._ui = {
      root,
      authOverlay: root.querySelector('#' + GameBootstrap.UI_OVERLAYS.AUTH),
      addressOverlay: root.querySelector('#' + GameBootstrap.UI_OVERLAYS.ADDRESS),
      loadingOverlay: root.querySelector('#' + GameBootstrap.UI_OVERLAYS.LOADING),
      errorOverlay: root.querySelector('#' + GameBootstrap.UI_OVERLAYS.ERROR),
      errorMessage: root.querySelector('#error-message'),
      pauseOverlay: root.querySelector('#' + GameBootstrap.UI_OVERLAYS.PAUSE),
      hud: root.querySelector('#' + GameBootstrap.UI_OVERLAYS.HUD),
      characterCreation: root.querySelector('#' + GameBootstrap.UI_OVERLAYS.CHARACTER_CREATION),
      authUsername: root.querySelector('#auth-username'),
      authPassword: root.querySelector('#auth-password'),
      authConfirm: root.querySelector('#auth-confirm'),
      authError: root.querySelector('#auth-error'),
      authSuccess: root.querySelector('#auth-success'),
      authSubmit: root.querySelector('#auth-submit'),
      authModeToggle: root.querySelector('#auth-mode-toggle'),
      authLogout: root.querySelector('#auth-logout'),
      addressInput: root.querySelector('#address-input'),
      addressSuggestions: root.querySelector('#address-suggestions'),
      addressError: root.querySelector('#address-error'),
      addressSubmit: root.querySelector('#address-submit'),
      errorBack: root.querySelector('#error-back'),
      errorRetry: root.querySelector('#error-retry'),
      pauseResume: root.querySelector('#pause-resume'),
      pauseLogout: root.querySelector('#pause-logout'),
      logoutBtn: root.querySelector('#logout-btn'),
      hpBar: root.querySelector('#hp-bar'),
      stBar: root.querySelector('#st-bar'),
      hudAddress: root.querySelector('#hud-address'),
      hudUser: root.querySelector('#hud-user'),
      statusEl: root.querySelector('#status'),
      clockEl: root.querySelector('#clock'),
      streetViewEl: root.querySelector('#streetview'),
      streetAttributionEl: root.querySelector('#streetviewAttribution'),
      weatherEl: root.querySelector('#weather'),
      inventoryEl: root.querySelector('#inventory'),
      promptEl: root.querySelector('#prompt'),
      homeAddressInput: root.querySelector('#homeAddress'),
      startBtn: root.querySelector('#startBtn'),
      lookToggle: root.querySelector('#lookToggle'),
      jumpBtn: root.querySelector('#jumpBtn'),
      interactBtn: root.querySelector('#interactBtn'),
    };

    this._authMode = 'login';
    this._suggestions = [];
    this._selectedSuggestion = null;
    this._suggestionDebounce = null;
    this._lastAddress = '';
    this._authSuccess = '';
    this._paused = false;
    this._escapeHandled = false;
    this._weather = null;
    this._inventory = [];

    this._bindUi();
    this._applyStyleSheet();
    this._setPhase(this.authManager?.playerId ? GameBootstrap.GAME_PHASES.ADDRESS : GameBootstrap.GAME_PHASES.AUTH);
    console.log('[Clamour] _initUi done');
  }

  _applyStyleSheet() {
    if (document.getElementById('clamour-dynamic-style')) return;
    const style = document.createElement('style');
    style.id = 'clamour-dynamic-style';
    style.textContent = `
      *{box-sizing:border-box}
      html,body,#app{width:100%;height:100%;margin:0;overflow:hidden;background:#05060a;color:#e8e8ea;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      canvas{position:fixed;inset:0;display:block;z-index:0}
      #clamour-ui-root .panel{background:rgba(8,9,14,.92)}
      #clamour-ui-root .row{margin-top:10px}
      #clamour-ui-root .panel input{width:100%;height:42px;background:#07080b;border:1px solid rgba(255,255,255,.12);color:#fff;padding:0 12px;border-radius:6px;outline:none}
      #clamour-ui-root .panel input:focus{border-color:rgba(207,221,161,.5)}
      #clamour-ui-root .panel button[disabled]{opacity:.6;cursor:wait}
      #clamour-ui-root .topbar,#clamour-ui-root .vitals,#clamour-ui-root .weather,#clamour-ui-root .inventory,#clamour-ui-root .crosshair,#clamour-ui-root .mobile-only{pointer-events:none}
      #clamour-ui-root .mobile-only button{pointer-events:auto}
      #clamour-ui-root .modal{position:fixed;inset:0;z-index:50;display:none;align-items:center;justify-content:center;background:rgba(4,5,8,.78);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
      #clamour-ui-root .overlay{position:fixed;inset:0;z-index:50;display:none;align-items:center;justify-content:center;background:rgba(4,5,8,.78);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
      #clamour-ui-root .panel{background:rgba(8,9,14,.92);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:22px 22px 18px;width:min(420px,calc(100% - 32px));box-shadow:0 30px 80px rgba(0,0,0,.45)}
      #clamour-ui-root .panel h1{margin:2px 0 8px;font-size:26px;letter-spacing:.02em}
      #clamour-ui-root .panel p{margin:0 0 14px;opacity:.78;font-size:13px;line-height:1.35}
      #clamour-ui-root .panel button{width:100%;height:44px;margin-top:10px;background:#0f1116;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:8px;cursor:pointer;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
      #clamour-ui-root .panel button:hover{border-color:rgba(255,255,255,.22);background:#13161d}
      #clamour-ui-root .panel button:active{transform:translateY(1px)}
      #clamour-ui-root .panel input::placeholder{opacity:.45}
      #clamour-ui-root .hidden{display:none!important}
      #clamour-ui-root button.clamour-auth-tab{background:transparent;border:1px solid rgba(255,255,255,.12);color:#a9abb2;border-radius:8px;padding:8px 10px;cursor:pointer;font-size:12px;letter-spacing:.08em;text-transform:uppercase}
      #clamour-ui-root button.clamour-auth-tab.active{color:#fff;border-color:rgba(255,255,255,.22);background:#13161d}
      #clamour-ui-root .clamour-auth-toggle{display:flex;gap:8px;margin-bottom:14px}
      #clamour-ui-root .clamour-auth-confirm{margin-top:10px}
      #clamour-ui-root .clamour-address-suggestions{max-height:180px;overflow:auto;background:#07080b;border:1px solid rgba(255,255,255,.08);border-radius:8px;margin-top:8px}
      #clamour-ui-root .suggestion-item:hover{background:#0e1016}
      #clamour-ui-root .modal .panel{pointer-events:auto}
      #clamour-ui-root .modal input{pointer-events:auto}
      #clamour-ui-root .modal button{pointer-events:auto}
      #clamour-ui-root .overlay .panel{pointer-events:auto}
      #clamour-ui-root .topbar{position:fixed;top:0;left:0;right:0;display:flex;justify-content:space-between;padding:10px 14px;pointer-events:none;z-index:10;font-family:monospace;font-size:10px;letter-spacing:.35em;text-transform:uppercase;color:rgba(255,255,255,.35)}
      #clamour-ui-root .vitals{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;gap:8px;z-index:20;pointer-events:none}
      #clamour-ui-root .meter{display:flex;align-items:center;gap:8px;font-family:monospace;font-size:10px;letter-spacing:.35em;text-transform:uppercase;color:rgba(255,255,255,.5)}
      #clamour-ui-root .meter i{display:block;width:140px;height:6px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden;position:relative}
      #clamour-ui-root .meter i::after{content:'';position:absolute;left:0;top:0;bottom:0;background:#38bdf8;border-radius:3px;transition:width .2s}
      #clamour-ui-root #hp-bar::after{background:#22c55e}
      #clamour-ui-root #st-bar::after{background:#38bdf8}
      #clamour-ui-root #crosshair{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:rgba(255,255,255,.6);font-size:18px;z-index:15;pointer-events:none;display:none}
      #clamour-ui-root #prompt{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);font-family:monospace;font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:rgba(255,255,255,.6);z-index:20;pointer-events:none;transition:opacity .3s}
      #clamour-ui-root #weather{position:fixed;top:40px;right:14px;font-family:monospace;font-size:9px;letter-spacing:.4em;text-transform:uppercase;color:rgba(255,255,255,.3);z-index:10;pointer-events:none;text-align:right}
      #clamour-ui-root #inventory{position:fixed;bottom:80px;right:14px;font-family:monospace;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.25);z-index:10;pointer-events:none;text-align:right}
      #clamour-ui-root #streetview{position:fixed;inset:0;z-index:0;background:#05060a;background-position:center;background-size:cover;background-repeat:no-repeat;pointer-events:none}
      #clamour-ui-root #streetviewAttribution{position:fixed;bottom:8px;left:14px;font-family:monospace;font-size:8px;letter-spacing:.3em;text-transform:uppercase;color:rgba(255,255,255,.2);z-index:5;pointer-events:none}
      #clamour-ui-root .mobile-only{position:fixed;bottom:0;left:0;right:0;display:none;justify-content:space-between;align-items:flex-end;padding:16px;z-index:30;pointer-events:none}
      #clamour-ui-root .mobile-only button{pointer-events:auto;background:rgba(0,0,0,.5);color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:10px 14px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}
      #clamour-ui-root #character-creation .panel{pointer-events:auto}
      #clamour-ui-root #character-creation .panel input{pointer-events:auto}
      #clamour-ui-root #character-creation .panel button{pointer-events:auto}
    `;
    document.head.appendChild(style);
  }

  _bindUi() {
    const ui = this._ui;
    const bootstrap = this;

    ui.authSubmit.addEventListener('click', () => bootstrap._authSubmitHandler());
    ui.authModeToggle.addEventListener('click', () => bootstrap._toggleAuthMode());
    ui.authLogout.addEventListener('click', () => bootstrap._logout());
    ui.logoutBtn.addEventListener('click', () => bootstrap._logout());
    ui.pauseResume.addEventListener('click', () => bootstrap._resume());
    ui.pauseLogout.addEventListener('click', () => bootstrap._logoutFromPause());
    ui.startBtn?.addEventListener('click', () => bootstrap._createCharacter());
    ui.jumpBtn?.addEventListener('click', () => {
      bootstrap.input.jump = true;
      setTimeout(() => { bootstrap.input.jump = false; }, 80);
    });
    ui.interactBtn?.addEventListener('click', () => bootstrap._doInteract());
    if (ui.authUsername) ui.authUsername.addEventListener('input', () => bootstrap._setAuthError(''));
    if (ui.authPassword) ui.authPassword.addEventListener('input', () => bootstrap._setAuthError(''));
    if (ui.authConfirm) ui.authConfirm.addEventListener('input', () => bootstrap._setAuthError(''));
  }

  _showOverlay(el) { if (el) el.style.display = 'flex'; }
  _hideOverlay(el) { if (el) el.style.display = 'none'; }

  _updateVitals(health, stamina) {
    const { hpBar, stBar } = this._ui;
    if (!hpBar || !stBar) return;
    const hPct = Math.max(0, Math.min(100, (health / 100) * 100));
    const sPct = Math.max(0, Math.min(100, (stamina / 100) * 100));
    hpBar.style.width = hPct + '%';
    stBar.style.width = sPct + '%';
    hpBar.style.background = hPct > 60 ? '#22c55e' : hPct > 30 ? '#f59e0b' : '#ef4444';
    stBar.style.background = sPct < 20 ? '#475569' : '#38bdf8';
  }

  _setPhase(phase, detail = {}) {
    const { authOverlay, addressOverlay, loadingOverlay, errorOverlay, pauseOverlay, hud, characterCreation, authLogout, authModeToggle, hudUser } = this._ui;

    this._hideOverlay(authOverlay);
    this._hideOverlay(addressOverlay);
    this._hideOverlay(loadingOverlay);
    this._hideOverlay(errorOverlay);
    this._hideOverlay(pauseOverlay);
    this._hideOverlay(hud);
    this._hideOverlay(characterCreation);

    if (phase === GameBootstrap.GAME_PHASES.AUTH) {
      this._showOverlay(authOverlay);
      if (authLogout) authLogout.style.display = 'none';
      if (authModeToggle) authModeToggle.style.display = 'inline-block';
      this._authSuccess = '';
      this._paused = false;
    } else if (phase === GameBootstrap.GAME_PHASES.ADDRESS) {
      this._showOverlay(addressOverlay);
      if (hudUser) hudUser.textContent = detail.username || '';
      this._paused = false;
    } else if (phase === GameBootstrap.GAME_PHASES.LOADING) {
      this._showOverlay(loadingOverlay);
      this._paused = false;
    } else if (phase === GameBootstrap.GAME_PHASES.ERROR) {
      this._showOverlay(errorOverlay);
      if (this._ui.errorMessage) this._ui.errorMessage.textContent = detail.error || 'Erro desconhecido.';
      this._paused = false;
    } else if (phase === GameBootstrap.GAME_PHASES.PLAYING) {
      this._showOverlay(hud);
      if (hudUser) hudUser.textContent = this.authManager?.username || '';
      this._paused = false;
    } else if (phase === GameBootstrap.GAME_PHASES.PAUSED) {
      this._showOverlay(pauseOverlay);
      this._paused = true;
    } else if (phase === GameBootstrap.GAME_PHASES.CHARACTER) {
      this._showOverlay(characterCreation);
      this._paused = false;
    }
  }

  _validateUsername(value) {
    return /^[a-z0-9_]{3,24}$/.test(value.trim().toLowerCase());
  }

  _validatePassword(value) {
    return value.length >= 6;
  }

  _setAuthError(message) {
    const authError = this._ui.authError;
    authError.textContent = message;
    authError.style.display = message ? 'block' : 'none';
  }

  _setAuthSuccess(message) {
    this._authSuccess = message;
    const el = this._ui.authSuccess;
    if (!el) return;
    el.textContent = message;
    el.style.display = message ? 'block' : 'none';
  }

  async _authSubmitHandler() {
    const username = this._ui.authUsername.value.trim().toLowerCase();
    const password = this._ui.authPassword.value;
    const confirm = this._ui.authConfirm.value;

    if (!this._validateUsername(username)) {
      this._setAuthError('Usuario: 3 a 24 caracteres, usando letras, numeros ou _.');
      return;
    }
    if (!this._validatePassword(password)) {
      this._setAuthError('Senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (this._authMode === 'register' && password !== confirm) {
      this._setAuthError('As senhas nao coincidem.');
      return;
    }

    this._ui.authSubmit.disabled = true;
    this._setAuthError('');
    this._setAuthSuccess('');
    try {
      if (this._authMode === 'register') {
        await this.authManager.register(username, password);
        this._setAuthSuccess('Conta criada com sucesso.');
        setTimeout(() => this.showAddressPhase(), 900);
      } else {
        await this.authManager.login(username, password);
        this.showAddressPhase();
      }
    } catch (err) {
      this._setAuthError(err instanceof Error ? err.message : 'Falha na autenticacao.');
    } finally {
      this._ui.authSubmit.disabled = false;
    }
  }

  _toggleAuthMode() {
    if (this._authMode === 'login') {
      this._authMode = 'register';
      this._ui.authSubmit.textContent = 'Criar conta';
      this._ui.authModeToggle.textContent = 'Ja tenho conta';
      this._ui.authConfirm.style.display = 'block';
    } else {
      this._authMode = 'login';
      this._ui.authSubmit.textContent = 'Entrar no mundo';
      this._ui.authModeToggle.textContent = 'Criar conta';
      this._ui.authConfirm.style.display = 'none';
    }
    this._setAuthError('');
    this._setAuthSuccess('');
  }

  async _loadSuggestions(query) {
    if (this._suggestionDebounce) clearTimeout(this._suggestionDebounce);
    if (query.trim().length < 3) {
      this._ui.addressSuggestions.style.display = 'none';
      this._suggestions = [];
      return;
    }

    this._suggestionDebounce = setTimeout(async () => {
      try {
        const results = await window.__clamourNetwork.searchAddresses(query);
        this._suggestions = results;
        this._selectedSuggestion = null;
        if (results.length > 0) {
          this._ui.addressSuggestions.innerHTML = results.map((s, i) => `
            <div class="suggestion-item" data-index="${i}" style="padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer;display:flex;align-items:center;gap:8px;">
              <span style="font-size:11px;color:rgba(255,255,255,.65);">${s.displayName}</span>
            </div>
          `).join('');
          this._ui.addressSuggestions.style.display = 'block';
        } else {
          this._ui.addressSuggestions.style.display = 'none';
        }
      } catch {
        this._suggestions = [];
        this._ui.addressSuggestions.style.display = 'none';
      }
    }, 350);
  }

  _selectSuggestion(index) {
    if (!this._suggestions[index]) return;
    this._selectedSuggestion = this._suggestions[index];
    this._ui.addressInput.value = this._selectedSuggestion.displayName;
    this._ui.addressSuggestions.style.display = 'none';
    this._ui.addressError.style.display = 'none';
  }

  async _addressSubmitHandler() {
    const value = this._ui.addressInput.value.trim();
    if (value.length < 4) {
      this._ui.addressError.textContent = 'Digite um endereco completo.';
      this._ui.addressError.style.display = 'block';
      return;
    }

    this._ui.addressSubmit.disabled = true;
    this._ui.addressError.style.display = 'none';

    let lat, lon;
    if (this._selectedSuggestion) {
      lat = this._selectedSuggestion.lat;
      lon = this._selectedSuggestion.lon;
    } else {
      const geo = await window.__clamourNetwork.geocodeAddress(value);
      if (!geo) {
        this._ui.addressError.textContent = 'Nao foi possivel localizar esse endereco em Araras.';
        this._ui.addressError.style.display = 'block';
        this._ui.addressSubmit.disabled = false;
        return;
      }
      lat = geo.lat;
      lon = geo.lon;
    }

    this._lastAddress = value;
    if (this._ui.hudAddress) this._ui.hudAddress.textContent = value;
    await this.startGame(value, lat, lon);
    this._ui.addressSubmit.disabled = false;
  }

  _logout() {
    this.authManager.clearSession();
    this.showAuthPhase();
    if (this._ui.hudAddress) this._ui.hudAddress.textContent = '';
  }

  _logoutFromPause() {
    this._logout();
  }

  _resume() {
    this.phase = GameBootstrap.GAME_PHASES.PLAYING;
    this._paused = false;
    this._setPhase(GameBootstrap.GAME_PHASES.PLAYING);
  }

  showAuthPhase() {
    this.phase = GameBootstrap.GAME_PHASES.AUTH;
    this._emit('phase:change', { phase: GameBootstrap.GAME_PHASES.AUTH });
  }

  showAddressPhase() {
    this.phase = GameBootstrap.GAME_PHASES.ADDRESS;
    this._emit('phase:change', { phase: GameBootstrap.GAME_PHASES.ADDRESS, username: this.authManager.username } );
  }

  async _createCharacter() {
    const address = this._ui.homeAddressInput?.value.trim();
    if (!address) {
      this._showPrompt('Digite o endereco da casa.');
      return;
    }
    this._showPrompt('localizando sua casa...');
    try {
      const geo = await window.__clamourNetwork.geocodeAddress(address);
      if (!geo) {
        this._showPrompt('Nao foi possivel localizar o endereco.');
        return;
      }
      const playerId = this.authManager.playerId || crypto.randomUUID();
      this.homeLat = geo.lat;
      this.homeLon = geo.lon;
      this.address = address;
      await window.__clamourNetwork.savePlayerState(playerId, {
        playerId,
        homeLat: geo.lat,
        homeLon: geo.lon,
        posX: 0,
        posY: window.RULES.movement.controllerHeight / 2,
        posZ: 0,
        yaw: 0,
        homeAddress: address,
      });
      this._hideOverlay(this._ui.characterCreation);
      this._initialized = true;
      this._updateStatus('online');
      await this.startGame(address, geo.lat, geo.lon);
    } catch (err) {
      this._showPrompt(err instanceof Error ? err.message : 'Erro ao criar personagem.');
    }
  }

  _showPrompt(text) {
    if (this._promptTimeout) clearTimeout(this._promptTimeout);
    const el = this._ui.promptEl;
    if (!el) return;
    el.textContent = text || '';
    el.style.opacity = text ? '1' : '0';
    if (text) {
      this._promptTimeout = setTimeout(() => {
        el.style.opacity = '0';
        this._promptTimeout = null;
      }, 3000);
    }
  }

  _updateStatus(text) {
    if (this._ui.statusEl) this._ui.statusEl.textContent = text;
  }

  _updateInventory() {
    if (!this._ui.inventoryEl) return;
    this._ui.inventoryEl.textContent = this._inventory.length ? `inventario: ${this._inventory.join(', ')}` : 'inventario: vazio';
  }

  async _doInteract() {
    let nearest = null;
    let dist = Infinity;
    for (const obj of this._pickups) {
      const d = Math.hypot(obj.position.x - this.player.position.x, obj.position.z - this.player.position.z);
      if (d < dist) { dist = d; nearest = obj; }
    }
    if (nearest && dist < 2.2) {
      const idx = this._pickups.indexOf(nearest);
      if (idx >= 0) this._pickups.splice(idx, 1);
      nearest.destroy();
      this._inventory.push('objeto');
      this._updateInventory();
      this._showPrompt('objeto guardado');
    }
  }

  _spawnPickup() {
    const entity = new pc.Entity('Pickup');
    entity.addComponent('render', { type: 'box' });
    const mat = new pc.StandardMaterial();
    mat.diffuse = new pc.Color(0.72, 0.64, 0.42);
    mat.emissive = new pc.Color(0.14, 0.11, 0.02);
    mat.emissiveIntensity = 0.4;
    mat.update();
    entity.render.material = mat;
    const angle = (this.player.yaw * Math.PI) / 180;
    entity.setPosition(
      this.player.position.x + Math.cos(angle) * 1.2,
      0.15,
      this.player.position.z + Math.sin(angle) * 1.2
    );
    entity.setLocalScale(0.25, 0.25, 0.25);
    this.app.root.addChild(entity);
    this._pickups.push(entity);
  }

  async startGame(address, preLat, preLon) {
    this.phase = GameBootstrap.GAME_PHASES.LOADING;
    this._emit('phase:change', { phase: GameBootstrap.GAME_PHASES.LOADING });

    try {
      const network = window.__clamourNetwork;
      const { geocodeAddress, getStreetViewMetadata, loadPlayerState, savePlayerState } = network;

      let lat = preLat;
      let lon = preLon;
      if (lat == null || lon == null) {
        const geo = await geocodeAddress(address);
        if (!geo) throw new Error('Nao foi possivel localizar esse endereco em Araras.');
        lat = geo.lat;
        lon = geo.lon;
      }

      const streetView = await getStreetViewMetadata(lat, lon);
      const streetLat = streetView.location.lat;
      const streetLon = streetView.location.lng;
      const initialYaw = this.bearingBetween(streetLat, streetLon, lat, lon);
      const playerId = this.authManager.playerId;
      const saved = await loadPlayerState(playerId);

      if (saved && saved.homeLat === lat && saved.homeLon === lon && (saved.posX !== 0 || saved.posZ !== 0 || saved.yaw !== 0)) {
        this.player.position.x = saved.posX;
        this.player.position.y = saved.posY;
        this.player.position.z = saved.posZ;
        this.player.yaw = saved.yaw;
      } else {
        this.player.position.set(0, window.RULES.movement.controllerHeight / 2, 0);
        this.player.yaw = initialYaw;
      }

      this.options = {
        streetView,
        originLat: lat,
        originLng: lon,
        initialYaw,
      };

      this.streetView = window.createStreetViewEnvironment(this.app.graphicsDevice.canvas, streetView);
      this._emit('streetview:attribution', this.streetView.attribution);

      this.refreshStreetView(true);
      this.updateCamera();

      this.playerEntity.render.enabled = true;
      this.phase = GameBootstrap.GAME_PHASES.PLAYING;
      this._initialized = true;
      this._updateStatus('online');
      this._emit('phase:change', { phase: GameBootstrap.GAME_PHASES.PLAYING });
    } catch (err) {
      console.error('startGame error:', err);
      this._emit('phase:change', { phase: GameBootstrap.GAME_PHASES.ERROR, error: err instanceof Error ? err.message : 'Erro ao inicializar o jogo.' });
    }
  }

  async _refreshWeather() {
    try {
      const { getUniversalServerUrl } = window.__clamourNetwork;
      const base = getUniversalServerUrl();
      const lat = this.options?.originLat || this.homeLat || -22.3572;
      const lng = this.options?.originLng || this.homeLon || -47.3841;
      const res = await fetch(`${base}/api/game/weather/current?lat=${lat}&lng=${lng}`);
      if (!res.ok) return;
      const payload = await res.json();
      const weather = payload?.data;
      if (weather && this._ui.weatherEl) {
        const temp = weather.temperatureC == null ? '--' : `${weather.temperatureC.toFixed(1)}°C`;
        this._ui.weatherEl.textContent = `${weather.description ?? weather.conditionType ?? 'clima'} • ${temp}`;
      }
      if (weather) {
        const day = Boolean(weather.isDaytime);
        const scene = this.app.scene;
        scene.ambientLight = day ? new pc.Color(0.08, 0.09, 0.12) : new pc.Color(0.01, 0.01, 0.02);
      }
    } catch {
      // offline
    }
  }

  bearingBetween(lat1, lon1, lat2, lon2) {
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const delta = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(delta) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(delta);
    const deg = Math.atan2(y, x) * 180 / Math.PI;
    return (deg + 360) % 360;
  }

  async refreshStreetView(force) {
    if (this.streetRequestActive || !this.streetView || !this.options) return;
    const moved = !Number.isFinite(this.lastStreetX) || Math.hypot(this.player.position.x - this.lastStreetX, this.player.position.z - this.lastStreetZ) >= window.RULES.streetView.metadataRadiusMeters / 10;
    const turned = !Number.isFinite(this.lastStreetYaw) || Math.abs(((this.player.yaw - this.lastStreetYaw + 540) % 360) - 180) >= 10;
    if (!force && !moved && !turned) return;
    this.streetRequestActive = true;
    try {
      const { getStreetViewMetadata } = window.__clamourNetwork;
      const currentGeo = this.worldToGeo(this.options.originLat, this.options.originLng, this.player.position.x, this.player.position.z);
      const current = await getStreetViewMetadata(currentGeo.lat, currentGeo.lng);
      await this.streetView.refresh(current, this.player.yaw, this.player.pitch);
      this._emit('streetview:attribution', this.streetView.attribution);
      this.lastStreetX = this.player.position.x;
      this.lastStreetZ = this.player.position.z;
      this.lastStreetYaw = this.player.yaw;
    } catch (error) {
      console.warn('[Clamour] Street View refresh failed', error);
    } finally {
      this.streetRequestActive = false;
    }
  }

  worldToGeo(originLat, originLng, x, z) {
    const metersPerDegreeLng = 111_320 * Math.max(0.2, Math.cos((originLat * Math.PI) / 180));
    return {
      lat: originLat - z / 111_320,
      lng: originLng + x / metersPerDegreeLng,
    };
  }

  updateCamera() {
    const pose = window.getCameraPose(this.player);
    this.camera.setPosition(pose.x, pose.y, pose.z);
    this.camera.setEulerAngles(pose.pitch, pose.yaw, pose.roll);
  }

  update(dt) {
    const delta = Math.min(dt, 0.1);

    if (this.input.escapePressed && !this._escapeHandled) {
      this._escapeHandled = true;
      if (this.phase === GameBootstrap.GAME_PHASES.PLAYING) {
        this.phase = GameBootstrap.GAME_PHASES.PAUSED;
        this._setPhase(GameBootstrap.GAME_PHASES.PAUSED);
      } else if (this.phase === GameBootstrap.GAME_PHASES.PAUSED) {
        this._resume();
      }
    }
    if (!this.input.escapePressed) {
      this._escapeHandled = false;
    }

    if (this.phase === GameBootstrap.GAME_PHASES.PAUSED || this.phase === GameBootstrap.GAME_PHASES.AUTH || this.phase === GameBootstrap.GAME_PHASES.ADDRESS || this.phase === GameBootstrap.GAME_PHASES.LOADING || this.phase === GameBootstrap.GAME_PHASES.ERROR) {
      return;
    }

    if (!this.input.jump) this.jumpConsumed = false;
    const jump = this.input.jump && !this.jumpConsumed;
    if (jump) this.jumpConsumed = true;
    const originalJump = this.input.jump;
    this.input.jump = jump;

    const { dx, dy } = window.consumeMouseDelta(this.input);
    this.input.mouseX = dx;
    this.input.mouseY = dy;

    if (!this.input.spawnObject) this.spawnConsumed = false;
    if (this.input.spawnObject && !this.spawnConsumed) {
      this.spawnConsumed = true;
      if (window.spawnTestObject) {
        const object = window.spawnTestObject(this.app, this.player.position);
        this.spawnedObjects.push(object);
      }
    }

    window.updatePlayer(this.player, this.input, delta, this.world.colliders);
    this.input.jump = originalJump;

    if (!this.input.triggerHorror) this.horrorConsumed = false;
    if (this.input.triggerHorror && !this.horrorConsumed) {
      this.horrorConsumed = true;
      const event = window.spawnHorrorEvent(this.app, this.player.position);
      this.horrorEvents.push(event);
    }

    window.updateHorrorEvents(this.horrorEvents, delta);

    this.playerEntity.setPosition(this.player.position.x, this.player.position.y, this.player.position.z);
    this.playerEntity.setEulerAngles(0, this.player.yaw, 0);

    this.updateCamera();

    if (this.callbacks?.onVitalsChange) {
      this.callbacks.onVitalsChange(this.player.vitals.health, this.player.vitals.stamina);
    }

    this.saveTimer += delta;
    if (this.saveTimer >= window.RULES.persistence.autosaveSeconds) {
      this.saveTimer = 0;
      const sessionId = this.authManager?.playerId || '';
      if (sessionId) {
        const { savePlayerState } = window.__clamourNetwork;
        savePlayerState(sessionId, {
          playerId: sessionId,
          homeLat: this.options?.originLat,
          homeLng: this.options?.originLng,
          posX: this.player.position.x,
          posY: this.player.position.y,
          posZ: this.player.position.z,
          yaw: this.player.yaw,
        }).catch(error => console.warn('[Clamour] Player state save failed', error));
      }
    }

    this.streetViewTimer += delta;
    if (this.streetViewTimer >= window.RULES.streetView.requestDebounceMs / 1000) {
      this.streetViewTimer = 0;
      this.refreshStreetView(false);
    }
  }

  loadPosition(x, y, z, yaw) {
    this.player.position.x = x;
    this.player.position.y = y;
    this.player.position.z = z;
    this.player.yaw = yaw;
    this.playerEntity.setPosition(x, y, z);
    this.updateCamera();
  }

  _emit(eventName, detail) {
    window.dispatchEvent(new CustomEvent('clamour:' + eventName, { detail }));
  }

  destroy() {
    if (this._clockInterval) clearInterval(this._clockInterval);
    if (this.cleanupInput) this.cleanupInput();
    if (this.streetView) this.streetView.dispose();
    if (this.authManager) this.authManager.destroy();
    window.destroyWorld(this.world);
    if (this._ui?.root) this._ui.root.remove();
  }
}

