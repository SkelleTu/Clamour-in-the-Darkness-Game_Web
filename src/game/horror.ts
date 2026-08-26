import * as pc from 'playcanvas';
import { RULES } from './rules';
import type { Vec3State } from './player';

export type HorrorEvent = {
  id: string;
  position: Vec3State;
  entity: pc.Entity;
  timer: number;
  fading: boolean;
};

function createHorrorMaterial() {
  const mat = new pc.StandardMaterial();
  mat.diffuse = new pc.Color(0.8, 0, 0.13);
  mat.emissive = new pc.Color(0.4, 0, 0.04);
  mat.emissiveIntensity = 1.5;
  mat.opacity = 0.85;
  mat.blendType = pc.BLEND_NORMAL;
  mat.update();
  return mat;
}

export function spawnHorrorEvent(
  app: pc.Application,
  playerPos: Vec3State,
): HorrorEvent {
  const angle = Math.random() * Math.PI * 2;
  const distance = RULES.horror.distanceMeters;
  const position: Vec3State = {
    x: playerPos.x + Math.cos(angle) * distance,
    y: 1.1,
    z: playerPos.z + Math.sin(angle) * distance,
  };

  const entity = new pc.Entity(`HORROR_${Math.random().toString(36).slice(2)}`);
  entity.addComponent('render', { type: 'cone' });
  entity.setPosition(position.x, position.y, position.z);
  entity.setLocalScale(0.01, 0.01, 0.01);
  entity.render!.material = createHorrorMaterial();
  app.root.addChild(entity);

  const light = new pc.Entity('ManifestationLight');
  light.addComponent('light', {
    type: 'omni',
    color: new pc.Color(1, 0, 0.1),
    intensity: 2.5,
    range: 8,
  });
  entity.addChild(light);

  return {
    id: entity.name,
    position,
    entity,
    timer: RULES.horror.manifestationSeconds,
    fading: false,
  };
}

export function updateHorrorEvents(
  events: HorrorEvent[],
  dt: number,
) {
  const totalDuration = RULES.horror.manifestationSeconds;

  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    event.timer -= dt;

    const progress =
      1 - event.timer / totalDuration;

    if (!event.fading) {
      const scale = Math.min(1, progress * 3);
      event.entity.setLocalScale(scale, scale, scale);
      event.entity.rotate(0, dt * 120, 0);

      if (event.entity.render?.material) {
        const mat = event.entity.render.material as pc.StandardMaterial;
        mat.opacity = Math.min(0.85, scale);
        mat.update();
      }
    }

    if (event.timer <= 0) {
      event.fading = true;

      if (event.entity.render?.material) {
        const mat = event.entity.render.material as pc.StandardMaterial;
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
}
