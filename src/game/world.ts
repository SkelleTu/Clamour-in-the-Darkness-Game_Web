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

  // Sky
  scene.background = new THREE.Color(0x0a0a12);
  scene.fog = new THREE.FogExp2(0x0a0a12, 0.04);

  // Ambient + directional
  const ambient = new THREE.AmbientLight(0x111122, 0.4);
  scene.add(ambient);

  const moon = new THREE.DirectionalLight(0x8899cc, 0.6);
  moon.position.set(50, 80, 30);
  moon.castShadow = true;
  scene.add(moon);

  // Street lamp helper
  const addLamp = (x: number, z: number) => {
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.06, 4.5, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x444455, roughness: 0.9 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, 2.25, z);
    scene.add(pole);

    const headGeo = new THREE.BoxGeometry(0.3, 0.15, 0.5);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x333344 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(x, 4.55, z);
    scene.add(head);

    const light = new THREE.PointLight(0xffeeaa, 1.8, 14, 2);
    light.position.set(x, 4.3, z);
    scene.add(light);
  };

  // Ground (road)
  const groundGeo = new THREE.PlaneGeometry(200, 200);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.95 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Sidewalk stripes
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.85 });
  for (let s = -1; s <= 1; s += 2) {
    const swGeo = new THREE.PlaneGeometry(3, 200);
    const sw = new THREE.Mesh(swGeo, sidewalkMat);
    sw.rotation.x = -Math.PI / 2;
    sw.position.set(s * 8, 0.02, 0);
    scene.add(sw);
  }

  // Road lane markings
  const markMat = new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 1 });
  for (let i = -10; i <= 10; i++) {
    const mGeo = new THREE.PlaneGeometry(0.15, 3);
    const m = new THREE.Mesh(mGeo, markMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0.01, i * 8);
    scene.add(m);
  }

  // Buildings along the street
  const buildingColors = [0x1c1c26, 0x1a1c20, 0x16181e, 0x1e1a20];
  const buildBuilding = (x: number, z: number, w: number, d: number, h: number) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color: buildingColors[Math.floor(Math.random() * buildingColors.length)],
      roughness: 0.9, metalness: 0.05,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // windows
    const winMat = new THREE.MeshStandardMaterial({
      color: 0x223344, emissive: new THREE.Color(0x112233),
      emissiveIntensity: Math.random() < 0.3 ? 0.8 : 0.1,
    });
    const rows = Math.floor(h / 2.5);
    const cols = Math.floor(w / 1.8);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wGeo = new THREE.PlaneGeometry(0.6, 0.9);
        const wMesh = new THREE.Mesh(wGeo, winMat.clone());
        wMesh.position.set(
          x - w / 2 + 0.9 + c * 1.8,
          1.5 + r * 2.5,
          z + d / 2 + 0.01,
        );
        scene.add(wMesh);
      }
    }

    const box = new THREE.Box3().setFromObject(mesh);
    colliders.push(box);
    return { mesh, box, id: `building_${x}_${z}` };
  };

  // Left-side buildings
  for (let i = -5; i <= 5; i++) {
    const w = 6 + Math.floor(Math.random() * 6);
    const h = 6 + Math.floor(Math.random() * 18);
    const d = 5 + Math.floor(Math.random() * 4);
    objects.push(buildBuilding(-12 - d / 2 - 1, i * 14, w, d, h));
  }

  // Right-side buildings
  for (let i = -5; i <= 5; i++) {
    const w = 6 + Math.floor(Math.random() * 6);
    const h = 6 + Math.floor(Math.random() * 18);
    const d = 5 + Math.floor(Math.random() * 4);
    objects.push(buildBuilding(12 + d / 2 + 1, i * 14, w, d, h));
  }

  // Street lamps
  for (let i = -4; i <= 4; i++) {
    addLamp(-7, i * 18);
    addLamp(7, i * 18 + 9);
  }

  // Trash bins / obstacles
  const binMat = new THREE.MeshStandardMaterial({ color: 0x334433, roughness: 0.9 });
  for (let i = -3; i <= 3; i++) {
    const bGeo = new THREE.CylinderGeometry(0.25, 0.28, 0.9, 8);
    const bin = new THREE.Mesh(bGeo, binMat);
    bin.position.set(-6.5 + (Math.random() - 0.5) * 0.4, 0.45, i * 15 + (Math.random() - 0.5) * 2);
    bin.castShadow = true;
    scene.add(bin);
    colliders.push(new THREE.Box3().setFromObject(bin));
  }

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
