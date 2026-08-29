import * as THREE from 'three';
import { RULES } from './rules';

export type HorrorEvent = {
  id: string;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  timer: number;
  fading: boolean;
};

const _manifestMat = new THREE.MeshStandardMaterial({
  color: 0xcc0022, emissive: new THREE.Color(0x660011), emissiveIntensity: 1,
  transparent: true, opacity: 0.85,
  roughness: 0.4,
});

export function spawnHorrorEvent(scene: THREE.Scene, playerPos: THREE.Vector3): HorrorEvent {
  const angle = Math.random() * Math.PI * 2;
  const dist = RULES.horror.distanceMeters;
  const pos = new THREE.Vector3(
    playerPos.x + Math.cos(angle) * dist,
    playerPos.y,
    playerPos.z + Math.sin(angle) * dist,
  );

  const geo = new THREE.ConeGeometry(0.3, 2.2, 8);
  const mat = _manifestMat.clone();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos).setY(1.1);
  mesh.scale.set(0, 0, 0);
  scene.add(mesh);

  const light = new THREE.PointLight(0xff0022, 2.5, 8, 2);
  light.position.copy(mesh.position);
  mesh.add(light);

  return {
    id: Math.random().toString(36).slice(2),
    position: pos,
    mesh,
    timer: RULES.horror.manifestationSeconds,
    fading: false,
  };
}

export function updateHorrorEvents(events: HorrorEvent[], dt: number, scene: THREE.Scene) {
  const totalDuration = RULES.horror.manifestationSeconds;
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    ev.timer -= dt;

    const progress = 1 - ev.timer / totalDuration;
    if (!ev.fading) {
      const s = Math.min(1, progress * 3);
      ev.mesh.scale.setScalar(s);
      ev.mesh.rotation.y += dt * 2;
      (ev.mesh.material as THREE.MeshStandardMaterial).opacity = Math.min(0.85, s);
    }

    if (ev.timer <= 0) {
      ev.fading = true;
      (ev.mesh.material as THREE.MeshStandardMaterial).opacity -= dt * 2;
      ev.mesh.scale.multiplyScalar(0.95);
      if ((ev.mesh.material as THREE.MeshStandardMaterial).opacity <= 0) {
        scene.remove(ev.mesh);
        events.splice(i, 1);
      }
    }
  }
}
