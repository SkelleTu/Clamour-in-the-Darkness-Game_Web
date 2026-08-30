import * as THREE from 'three';

type WorldObject = { mesh: THREE.Mesh; box: THREE.Box3; id: string };

export type World = {
  scene: THREE.Scene;
  colliders: THREE.Box3[];
  objects: WorldObject[];
};

export function buildWorld(scene: THREE.Scene): World {
  const colliders: THREE.Box3[] = [];
  const objects: WorldObject[] = [];

  scene.background = new THREE.Color(0x05060a);
  scene.fog = new THREE.FogExp2(0x05060a, 0.035);

  const ambient = new THREE.AmbientLight(0x111122, 0.4);
  scene.add(ambient);

  const moon = new THREE.DirectionalLight(0xffe9c8, 1.1);
  moon.position.set(40, 60, 20);
  moon.castShadow = true;
  scene.add(moon);

  const groundGeo = new THREE.PlaneGeometry(200, 200);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.95 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'ground';
  scene.add(ground);
  colliders.push(new THREE.Box3().setFromObject(ground));

  return { scene, colliders, objects };
}

export function spawnTestObject(scene: THREE.Scene, position: THREE.Vector3, colliders: THREE.Box3[]) {
  const geo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
  const mat = new THREE.MeshStandardMaterial({ color: 0xcc4422, roughness: 0.7 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(position).add(new THREE.Vector3(0, 0.2, -1.5));
  scene.add(mesh);
  colliders.push(new THREE.Box3().setFromObject(mesh));
  return mesh;
}
