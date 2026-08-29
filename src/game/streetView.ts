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

  const headings = [90, 270, 0, 180];
  const textures = await Promise.all(
    headings.map(async (heading) => {
      try {
        return await textureFromUrl(loader, streetViewImageUrl({
          pano: metadata.pano,
          lat: metadata.location.lat,
          lon: metadata.location.lng,
          heading,
          pitch: 0,
          fov: 90,
          width: 640,
          height: 640,
        }));
      } catch {
        return null;
      }
    }),
  );

  const materials = textures.map((texture, index) => {
    if (texture) {
      return new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
    }
    const dark = index < 2 ? 0x10131a : 0x050507;
    return new THREE.MeshBasicMaterial({ color: dark, side: THREE.BackSide });
  });

  const geometry = new THREE.BoxGeometry(180, 90, 180);
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.renderOrder = -10;
  scene.add(mesh);

  const dispose = () => {
    geometry.dispose();
    for (const material of materials) {
      material.map?.dispose();
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
