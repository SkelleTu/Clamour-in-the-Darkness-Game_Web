type GooglePlaceLocation = {
  lat?: () => number;
  lng?: () => number;
};

type GooglePlace = {
  id?: string;
  formattedAddress?: string;
  location?: GooglePlaceLocation;
  fetchFields: (options: { fields: string[] }) => Promise<void>;
};

type GooglePlacePrediction = {
  toPlace: () => GooglePlace;
};

type GoogleMapsApi = {
  importLibrary: (libraryName: string) => Promise<unknown>;
};

type PlaceAutocompleteElementLike = HTMLElement & {
  includedPrimaryTypes?: string[];
  includedRegionCodes?: string[];
  requestedLanguage?: string;
  requestedRegion?: string;
  locationBias?: { center: { lat: number; lng: number }; radius: number };
  placeholder?: string;
};

declare global {
  interface Window {
    google?: { maps?: GoogleMapsApi };
  }
}

let mapsApiPromise: Promise<GoogleMapsApi> | null = null;
let browserKeyPromise: Promise<string> | null = null;

import { UNIVERSAL_SERVER_URL } from '@/lib/universalServer';

async function getGoogleMapsApiKey(): Promise<string> {
  const envKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
  if (envKey) return envKey;

  if (!browserKeyPromise) {
    browserKeyPromise = fetch(`${UNIVERSAL_SERVER_URL}/api/game/google/client-config`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.apiKey) {
          throw new Error(String(payload?.error ?? 'Google Maps API key não configurada no Universal Server.'));
        }
        return String(payload.apiKey).trim();
      })
      .catch((error) => {
        browserKeyPromise = null;
        throw error;
      });
  }

  return browserKeyPromise;
}

export async function loadGooglePlaces(): Promise<GoogleMapsApi> {
  if (typeof window === 'undefined') {
    throw new Error('Google Maps só pode ser carregado no navegador.');
  }

  if (window.google?.maps?.importLibrary) return window.google.maps;
  if (mapsApiPromise) return mapsApiPromise;

  mapsApiPromise = (async () => {
    const key = await getGoogleMapsApiKey();
    if (!key) {
      throw new Error('Google Maps API key não configurada.');
    }

    return new Promise<GoogleMapsApi>((resolve, reject) => {
      const existing = document.querySelector('script[data-clamour-google-maps]') as HTMLScriptElement | null;
      if (existing) {
        const resolveExisting = () => {
          if (window.google?.maps?.importLibrary) resolve(window.google.maps);
          else reject(new Error('Google Maps carregou, mas a API não ficou disponível.'));
        };
        if (existing.dataset.loaded === 'true') resolveExisting();
        else {
          existing.addEventListener('load', resolveExisting, { once: true });
          existing.addEventListener('error', () => reject(new Error('Falha ao carregar a API do Google Maps.')), { once: true });
        }
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async`;
      script.dataset.clamourGoogleMaps = 'true';
      script.onload = () => {
        script.dataset.loaded = 'true';
        if (window.google?.maps?.importLibrary) resolve(window.google.maps);
        else reject(new Error('Google Maps carregou, mas a API não ficou disponível.'));
      };
      script.onerror = () => reject(new Error('Falha ao carregar a API do Google Maps.'));
      document.head.appendChild(script);
    });
  })();

  try {
    const api = await mapsApiPromise;
    await api.importLibrary('places');
    return api;
  } catch (error) {
    mapsApiPromise = null;
    throw error;
  }
}

export async function createPlaceAutocompleteElement(): Promise<PlaceAutocompleteElementLike> {
  const api = await loadGooglePlaces();
  const placesLibrary = await api.importLibrary('places') as {
    PlaceAutocompleteElement: new () => PlaceAutocompleteElementLike;
  };

  const element = new placesLibrary.PlaceAutocompleteElement();
  element.includedPrimaryTypes = ['street_address'];
  element.includedRegionCodes = ['br'];
  element.requestedLanguage = 'pt-BR';
  element.requestedRegion = 'br';
  element.locationBias = {
    center: { lat: -22.3574, lng: -47.3841 },
    radius: 15000,
  };
  element.placeholder = 'Rua XV de Novembro 123, Araras';
  return element;
}

export type GooglePlaceSelection = {
  placeId: string;
  displayName: string;
  lat: number;
  lon: number;
};

export async function resolvePlacePrediction(
  prediction: GooglePlacePrediction,
): Promise<GooglePlaceSelection> {
  const place = prediction.toPlace();
  await place.fetchFields({ fields: ['id', 'formattedAddress', 'location'] });

  const lat = Number(place.location?.lat?.());
  const lon = Number(place.location?.lng?.());
  const displayName = String(place.formattedAddress ?? '').trim();
  const placeId = String(place.id ?? '').trim();

  if (!placeId || !displayName || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error('O Google não retornou uma localização válida para esse endereço.');
  }

  return { placeId, displayName, lat, lon };
}
