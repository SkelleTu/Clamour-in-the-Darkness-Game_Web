import {
  streetViewImageUrl,
  type StreetViewMetadata,
} from '@/lib/universalServer';

export type StreetViewEnvironment = {
  attribution: string | null;
  refresh: (metadata: StreetViewMetadata, heading: number, pitch: number) => Promise<void>;
  dispose: () => void;
};

export function createStreetViewEnvironment(
  canvas: HTMLCanvasElement,
  metadata: StreetViewMetadata,
): StreetViewEnvironment {
  const parent = canvas.parentElement;
  if (!parent) {
    throw new Error('PlayCanvas canvas parent not found.');
  }

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

  let currentObjectUrl: string | null = null;
  let requestId = 0;
  let attribution = metadata.copyright;

  const load = async (
    nextMetadata: StreetViewMetadata,
    heading: number,
    pitch: number,
  ) => {
    const serial = ++requestId;
    const url = streetViewImageUrl({
      pano: nextMetadata.pano,
      lat: nextMetadata.location.lat,
      lon: nextMetadata.location.lng,
      heading,
      pitch,
      fov: 96,
      width: 1024,
      height: 640,
    });

    const response = await fetch(url, {
      headers: { Accept: 'image/*' },
    });

    if (!response.ok) {
      throw new Error(
        `Street View image request failed: HTTP ${response.status}`,
      );
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.decoding = 'async';
    image.src = objectUrl;
    await image.decode();

    if (serial !== requestId) {
      URL.revokeObjectURL(objectUrl);
      return;
    }

    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
    }

    currentObjectUrl = objectUrl;
    element.style.backgroundImage = `url("${objectUrl}")`;
    attribution = nextMetadata.copyright;
  };

  void load(metadata, 0, 0).catch(() => {
    element.style.backgroundImage = '';
  });

  return {
    get attribution() {
      return attribution;
    },
    refresh: async (nextMetadata, heading, pitch) => {
      await load(nextMetadata, heading, pitch);
    },
    dispose: () => {
      requestId += 1;
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
        currentObjectUrl = null;
      }
      element.remove();
    },
  };
}
