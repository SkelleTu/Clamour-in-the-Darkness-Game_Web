import * as pc from 'playcanvas';
import {
  getStreetViewMetadata,
  savePlayerState,
  broadcastHorrorEvent,
  type StreetViewMetadata,
} from '@/lib/universalServer';
import { RULES } from './rules';
import {
  bindInput,
  createInputState,
  isTouchDevice,
  type InputState,
} from './input';
import {
  createPlayerState,
  getCameraPose,
  updatePlayer,
  type PlayerState,
} from './player';
import {
  buildWorld,
  destroyWorld,
  type World,
} from './world';
import {
  spawnHorrorEvent,
  updateHorrorEvents,
  type HorrorEvent,
} from './horror';
import {
  createStreetViewEnvironment,
  type StreetViewEnvironment,
} from './streetView';

export type GameCallbacks = {
  onVitalsChange: (health: number, stamina: number) => void;
  onPointerLock: (locked: boolean) => void;
  onStreetViewAttribution?: (text: string | null) => void;
};

export type GameOptions = {
  streetView: StreetViewMetadata;
  initialYaw: number;
  originLat: number;
  originLng: number;
};

function worldToGeo(originLat: number, originLng: number, x: number, z: number) {
  const metersPerDegreeLng =
    111_320 * Math.max(0.2, Math.cos((originLat * Math.PI) / 180));

  return {
    lat: originLat - z / 111_320,
    lng: originLng + x / metersPerDegreeLng,
  };
}

export async function createGame(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  options: GameOptions,
) {
  const isTouch = isTouchDevice();

  let sessionId = localStorage.getItem('clamour_player_id') ?? '';

  if (!sessionId) {
    sessionId =
      Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('clamour_player_id', sessionId);
  }

  const input = createInputState();
  const app = new pc.Application(canvas, {
    graphicsDeviceOptions: {
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    },
    elementInput: new pc.ElementInput(canvas),
    mouse: new pc.Mouse(canvas),
    touch: isTouch ? new pc.TouchDevice(canvas) : null,
    keyboard: new pc.Keyboard(window),
    gamepads: new pc.GamePads(),
  });

  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.start();

  const camera = new pc.Entity('Camera');
  camera.addComponent('camera', {
    clearColor: new pc.Color(0, 0, 0, 0),
    fov: RULES.streetView.fov,
    nearClip: 0.05,
    farClip: 2000,
  });
  app.root.addChild(camera);

  const ambient = new pc.Entity('AmbientLight');
  ambient.addComponent('light', {
    type: 'directional',
    color: new pc.Color(0.45, 0.5, 0.62),
    intensity: 0.35,
  });
  ambient.setEulerAngles(50, 25, 0);
  app.root.addChild(ambient);

  const moon = new pc.Entity('MoonLight');
  moon.addComponent('light', {
    type: 'directional',
    color: new pc.Color(0.54, 0.62, 0.82),
    intensity: 0.7,
    castShadows: true,
  });
  moon.setEulerAngles(58, -35, 0);
  app.root.addChild(moon);

  const world: World = buildWorld(app);
  const player = createPlayerState();
  player.yaw = options.initialYaw;

  const playerEntity = new pc.Entity('Player');
  playerEntity.addComponent('render', {
    type: 'capsule',
    castShadows: true,
  });
  playerEntity.render!.enabled = false;
  app.root.addChild(playerEntity);

  const streetView = createStreetViewEnvironment(canvas, options.streetView);

  callbacks.onStreetViewAttribution?.(streetView.attribution);

  const horrorEvents: HorrorEvent[] = [];
  let saveTimer = 0;
  let streetViewTimer = 0;
  let lastStreetX = Number.NaN;
  let lastStreetZ = Number.NaN;
  let lastStreetYaw = Number.NaN;
  let streetRequestActive = false;
  let jumpConsumed = false;
  let horrorConsumed = false;

  const cleanupInput = bindInput(
    input,
    canvas,
    () => {
      input.interact = true;
    },
    () => {
      input.triggerHorror = true;
    },
  );

  const updateCamera = () => {
    const pose = getCameraPose(player);
    camera.setPosition(pose.x, pose.y, pose.z);
    camera.setEulerAngles(pose.pitch, pose.yaw, pose.roll);
  };

  const refreshStreetView = async (force = false) => {
    if (streetRequestActive) return;

    const moved =
      !Number.isFinite(lastStreetX) ||
      Math.hypot(
        player.position.x - lastStreetX,
        player.position.z - lastStreetZ,
      ) >= RULES.streetView.metadataRadiusMeters / 10;

    const turned =
      !Number.isFinite(lastStreetYaw) ||
      Math.abs(((player.yaw - lastStreetYaw + 540) % 360) - 180) >= 10;

    if (!force && !moved && !turned) return;

    streetRequestActive = true;

    try {
      const currentGeo = worldToGeo(
        options.originLat,
        options.originLng,
        player.position.x,
        player.position.z,
      );

      const current = await getStreetViewMetadata(
        currentGeo.lat,
        currentGeo.lng,
      );

      await streetView.refresh(current, player.yaw, player.pitch);
      callbacks.onStreetViewAttribution?.(streetView.attribution);

      lastStreetX = player.position.x;
      lastStreetZ = player.position.z;
      lastStreetYaw = player.yaw;
    } catch (error) {
      console.warn('[Clamour] Street View refresh failed', error);
    } finally {
      streetRequestActive = false;
    }
  };

  const onUpdate = (dt: number) => {
    const delta = Math.min(dt, 0.1);

    if (!input.jump) jumpConsumed = false;

    const jump = input.jump && !jumpConsumed;
    if (jump) jumpConsumed = true;

    const originalJump = input.jump;
    input.jump = jump;

    updatePlayer(player, input, delta, world.colliders);
    input.jump = originalJump;

    if (!input.triggerHorror) horrorConsumed = false;

    if (input.triggerHorror && !horrorConsumed) {
      horrorConsumed = true;

      const event = spawnHorrorEvent(app, player.position);
      horrorEvents.push(event);

      void broadcastHorrorEvent(
        sessionId,
        event.position.x,
        event.position.y,
        event.position.z,
      );
    }

    if (isTouch) {
      input.jump = false;
      input.interact = false;
      input.triggerHorror = false;
    }

    updateHorrorEvents(horrorEvents, delta);

    playerEntity.setPosition(
      player.position.x,
      player.position.y,
      player.position.z,
    );
    playerEntity.setEulerAngles(0, player.yaw, 0);

    updateCamera();

    callbacks.onVitalsChange(
      player.vitals.health,
      player.vitals.stamina,
    );

    saveTimer += delta;
    if (saveTimer >= RULES.persistence.autosaveSeconds) {
      saveTimer = 0;
      void savePlayerState(
        sessionId,
        player.position,
        player.yaw,
      ).catch(error => {
        console.warn('[Clamour] Player state save failed', error);
      });
    }

    streetViewTimer += delta;
    if (streetViewTimer >= RULES.streetView.requestDebounceMs / 1000) {
      streetViewTimer = 0;
      void refreshStreetView();
    }
  };

  app.on('update', onUpdate);

  const checkPointerLock = () => {
    callbacks.onPointerLock(document.pointerLockElement === canvas);
  };
  document.addEventListener('pointerlockchange', checkPointerLock);

  await refreshStreetView(true);
  updateCamera();

  return {
    get sessionId() {
      return sessionId;
    },
    get player() {
      return player;
    },
    get input() {
      return input;
    },
    get isTouch() {
      return isTouch;
    },
    get camera() {
      return camera;
    },
    get app() {
      return app;
    },
    loadPosition(x: number, y: number, z: number, yaw: number) {
      player.position.x = x;
      player.position.y = y;
      player.position.z = z;
      player.yaw = yaw;
      playerEntity.setPosition(x, y, z);
      updateCamera();
    },
    touchControls: {
      onMove(x: number, y: number) {
        input.forward = y < -0.15;
        input.backward = y > 0.15;
        input.left = x < -0.15;
        input.right = x > 0.15;
      },
      onLook(dx: number, dy: number) {
        input.mouseX += dx;
        input.mouseY += dy;
      },
      onJump() {
        input.jump = true;
      },
      onSprint(active: boolean) {
        input.sprint = active;
      },
      onInteract() {
        input.interact = true;
      },
      onHorror() {
        input.triggerHorror = true;
      },
    },
    destroy() {
      cleanupInput();
      document.removeEventListener('pointerlockchange', checkPointerLock);
      streetView.dispose();
      destroyWorld(world);
      app.destroy();
    },
  };
}
