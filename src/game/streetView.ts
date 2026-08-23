import * as THREE from 'three';
import { streetViewImageUrl, type StreetViewMetadata } from '@/lib/universalServer';

export type StreetViewEnvironment = {
  mesh: THREE.Mesh;
  attribution: string | null;
  dispose: () => void;
};

function textureFromUrl(loader: THREE.TextureLoader, url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

export async function createStreetViewEnvironment(
  scene: THREE.Scene,
  metadata: StreetViewMetadata,
): Promise<StreetViewEnvironment> {
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');

  const faces = [
    90,   // +X
    270,  // -X
    0,    // +Z
    180,  // -Z
  ];

  const textures = await Promise.all(
    faces.map((heading) => textureFromUrl(loader, streetViewImageUrl({
      pano: metadata.pano,
      lat: metadata.location.lat,
      lon: metadata.location.lng,
      heading,
      pitch: 0,
      fov: 90,
      width: 640,
      height: 640,
    }))),
  );

  const fallback = new THREE.MeshBasicMaterial({ color: 0x050507, side: THREE.BackSide });
  const materials = [
    new THREE.MeshBasicMaterial({ map: textures[0], side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: textures[1], side: THREE.BackSide }),
    fallback,
    fallback,
    new THREE.MeshBasicMaterial({ map: textures[2], side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: textures[3], side: THREE.BackSide }),
  ];

  const geometry = new THREE.BoxGeometry(180, 90, 180);
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.renderOrder = -10;
  scene.add(mesh);

  const dispose = () => {
    geometry.dispose();
    for (const material of materials) {
      if (material !== fallback) material.map?.dispose();
      material.dispose();
    }
    scene.remove(mesh);
  };

  return {
    mesh,
    attribution: metadata.copyright,
    dispose,
  };
}
