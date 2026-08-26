import * as pc from 'playcanvas';
import type { BoxCollider } from './player';

export type WorldObject = {
  entity: pc.Entity;
  collider?: BoxCollider;
  id: string;
};

export type World = {
  root: pc.Entity;
  objects: WorldObject[];
  colliders: BoxCollider[];
};

function material(
  color: pc.Color,
  roughness = 0.9,
  emissive?: pc.Color,
  emissiveIntensity = 0,
) {
  const result = new pc.StandardMaterial();
  result.diffuse = color;
  result.roughness = roughness;
  if (emissive) {
    result.emissive = emissive;
    result.emissiveIntensity = emissiveIntensity;
  }
  result.update();
  return result;
}

function addBox(
  parent: pc.Entity,
  id: string,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  mat: pc.StandardMaterial,
  collider?: BoxCollider,
): WorldObject {
  const entity = new pc.Entity(id);
  entity.addComponent('render', { type: 'box' });
  entity.setLocalPosition(x, y, z);
  entity.setLocalScale(sx, sy, sz);
  entity.render!.material = mat;
  parent.addChild(entity);

  return { entity, collider, id };
}

export function buildWorld(app: pc.Application): World {
  const objects: WorldObject[] = [];
  const colliders: BoxCollider[] = [];
  const root = new pc.Entity('ClamourWorld');
  app.root.addChild(root);

  const groundMat = material(new pc.Color(0.08, 0.09, 0.12));
  const buildingMat = material(new pc.Color(0.11, 0.12, 0.15));
  const sidewalkMat = material(new pc.Color(0.16, 0.16, 0.19));
  const lampMat = material(new pc.Color(0.18, 0.18, 0.21));
  const binMat = material(new pc.Color(0.12, 0.18, 0.14));
  const windowMat = material(
    new pc.Color(0.06, 0.09, 0.13),
    0.8,
    new pc.Color(0.03, 0.08, 0.15),
    0.7,
  );

  objects.push(addBox(
    root,
    'Ground',
    0,
    -0.04,
    0,
    200,
    0.08,
    200,
    groundMat,
  ));

  for (const side of [-1, 1]) {
    objects.push(addBox(
      root,
      `Sidewalk_${side > 0 ? 'R' : 'L'}`,
      side * 8,
      0.03,
      0,
      3,
      0.06,
      200,
      sidewalkMat,
    ));
  }

  for (const side of [-1, 1]) {
    for (let index = -5; index <= 5; index++) {
      const width = 6 + ((index + 6) % 5);
      const height = 7 + ((index + 11) % 14);
      const depth = 6 + ((index + 3) % 4);
      const z = index * 14;
      const x = side < 0
        ? -12 - depth / 2 - 1
        : 12 + depth / 2 + 1;

      const collider: BoxCollider = {
        minX: x - width / 2,
        maxX: x + width / 2,
        minZ: z - depth / 2,
        maxZ: z + depth / 2,
      };

      const building = addBox(
        root,
        `BLDG_Block_${side}_${index}`,
        x,
        height / 2,
        z,
        width,
        height,
        depth,
        buildingMat,
        collider,
      );

      objects.push(building);
      colliders.push(collider);

      const rows = Math.max(1, Math.floor(height / 2.5));
      const cols = Math.max(1, Math.floor(width / 1.8));
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const window = new pc.Entity(
            `WINDOW_${side}_${index}_${row}_${col}`,
          );
          window.addComponent('render', { type: 'box' });
          window.setLocalScale(0.6, 0.9, 0.04);
          window.setLocalPosition(
            side < 0
              ? x + width / 2 + 0.02
              : x - width / 2 - 0.02,
            1.5 + row * 2.5,
            z - depth / 2 + 0.9 + col * 1.8,
          );
          window.setLocalEulerAngles(
            0,
            side < 0 ? 90 : -90,
            0,
          );
          window.render!.material = windowMat;
          root.addChild(window);
        }
      }
    }
  }

  for (let index = -4; index <= 4; index++) {
    for (const [side, offset] of [[-7, 0], [7, 9]] as const) {
      const lamp = new pc.Entity(`LAMP_${index}_${side}`);
      lamp.addComponent('render', { type: 'cylinder' });
      lamp.setLocalScale(0.08, 4.5, 0.08);
      lamp.setLocalPosition(side, 2.25, index * 18 + offset);
      lamp.render!.material = lampMat;
      root.addChild(lamp);

      const light = new pc.Entity(
        `LAMP_LIGHT_${index}_${side}`,
      );
      light.addComponent('light', {
        type: 'omni',
        color: new pc.Color(1, 0.92, 0.7),
        intensity: 1.4,
        range: 14,
      });
      light.setLocalPosition(
        side,
        4.3,
        index * 18 + offset,
      );
      root.addChild(light);
    }
  }

  for (let index = -3; index <= 3; index++) {
    const z = index * 15;
    const x = -6.5;
    const collider: BoxCollider = {
      minX: x - 0.3,
      maxX: x + 0.3,
      minZ: z - 0.3,
      maxZ: z + 0.3,
    };

    const bin = addBox(
      root,
      `PROP_Bin_${index}`,
      x,
      0.45,
      z,
      0.5,
      0.9,
      0.5,
      binMat,
      collider,
    );

    objects.push(bin);
    colliders.push(collider);
  }

  return { root, objects, colliders };
}

export function destroyWorld(world: World) {
  world.root.destroy();
}
