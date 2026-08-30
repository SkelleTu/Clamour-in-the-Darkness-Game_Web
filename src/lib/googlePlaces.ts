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
  placeholder?: string;
};

declare global {
  interface Window {
    google?: { maps?: GoogleMapsApi };
  }
}

let mapsApiPromise: Promise<GoogleMapsApi> | null = null;

function getGoogleMapsApiKey(): string {
  return String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
}

export async function loadGooglePlaces(): Promise<GoogleMapsApi> {
  if (typeof window === 'undefined') {
    throw new Error('Google Maps só pode ser carregado no navegador.');
  }

  if (window.google?.maps?.importLibrary) return window.google.maps;
  if (mapsApiPromise) return mapsApiPromise;

  const key = getGoogleMapsApiKey();
  if (!key) {
    throw new Error('VITE_GOOGLE_MAPS_API_KEY não configurada.');
  }

  mapsApiPromise = new Promise<GoogleMapsApi>((resolve, reject) => {
    const existing = document.querySelector('script[data-clamour-google-maps]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.google?.maps?.importLibrary) resolve(window.google.maps);
        else reject(new Error('Google Maps carregou, mas a API não ficou disponível.'));
      }, { once: true });
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar a API do Google Maps.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async`;
    script.dataset.clamourGoogleMaps = 'true';
    script.onload = () => {
      if (window.google?.maps?.importLibrary) resolve(window.google.maps);
      else reject(new Error('Google Maps carregou, mas a API não ficou disponível.'));
    };
    script.onerror = () => reject(new Error('Falha ao carregar a API do Google Maps.'));
    document.head.appendChild(script);
  });

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
