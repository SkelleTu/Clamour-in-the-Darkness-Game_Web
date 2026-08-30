import {
  geocodeAddress as serverGeocodeAddress,
  loadPlayerState,
  savePlayerState as serverSavePlayerState,
  UNIVERSAL_SERVER_URL,
  type PlayerState,
} from '@/lib/universalServer';

export async function broadcastHorrorEvent(
  _playerId: string,
  _x: number,
  _y: number,
  _z: number,
) {
  // Event transport will be wired through the multiplayer API. The old
  // Supabase write is intentionally removed so the game has one backend.
}

export type SavedPlayerState = {
  id: string;
  home_address: string;
  home_lat: number;
  home_lon: number;
  pos_x: number;
  pos_y: number;
  pos_z: number;
  yaw: number;
  updated_at: string;
};

export type GeocodeResult = { lat: number; lon: number } | null;

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  return serverGeocodeAddress(address);
}

export type AddressSuggestion = {
  placeId: string;
  displayName: string;
  mainText: string;
  secondaryText: string;
  lat?: number;
  lon?: number;
};

export function createPlacesSessionToken(): string {
  return crypto.randomUUID();
}

export async function searchAddresses(
  query: string,
  sessionToken: string,
): Promise<AddressSuggestion[]> {
  if (query.trim().length < 3) return [];
  try {
    const result = await fetch(
      `${UNIVERSAL_SERVER_URL}/api/game/google/autocomplete?input=${encodeURIComponent(query)}&sessionToken=${encodeURIComponent(sessionToken)}`,
      { headers: { Accept: 'application/json' } },
    );
    if (!result.ok) return [];
    const payload = await result.json();
    const rows = Array.isArray(payload?.predictions) ? payload.predictions : [];
    return rows
      .map((item: {
        placeId?: string;
        displayName?: string;
        mainText?: string;
        secondaryText?: string;
      }) => ({
        placeId: item.placeId ?? '',
        displayName: item.displayName ?? '',
        mainText: item.mainText ?? item.displayName ?? '',
        secondaryText: item.secondaryText ?? '',
      }))
      .filter((s: AddressSuggestion) => s.placeId && s.displayName)
      .slice(0, 5);
  } catch {
    return [];
  }
}

export async function getAddressPlaceDetails(
  placeId: string,
  sessionToken: string,
): Promise<AddressSuggestion | null> {
  if (!placeId) return null;
  try {
    const result = await fetch(
      `${UNIVERSAL_SERVER_URL}/api/game/google/place-details?placeId=${encodeURIComponent(placeId)}&sessionToken=${encodeURIComponent(sessionToken)}`,
      { headers: { Accept: 'application/json' } },
    );
    if (!result.ok) return null;
    const payload = await result.json();
    const lat = Number(payload?.lat);
    const lon = Number(payload?.lon);
    const displayName = String(payload?.displayName ?? '').trim();
    if (!displayName || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return {
      placeId: String(payload?.placeId ?? placeId),
      displayName,
      mainText: displayName,
      secondaryText: '',
      lat,
      lon,
    };
  } catch {
    return null;
  }
}

export async function loadOrCreatePlayer(
  sessionId: string,
  homeAddress: string,
  lat: number,
  lon: number,
): Promise<SavedPlayerState> {
  const saved = await loadPlayerState(sessionId);
  const sameHome = Boolean(saved)
    && Math.abs(Number(saved!.homeLat) - lat) < 0.0005
    && Math.abs(Number(saved!.homeLon) - lon) < 0.0005;

  if (saved && sameHome) {
    return {
      id: sessionId,
      home_address: String(saved.homeAddress ?? homeAddress),
      home_lat: Number(saved.homeLat ?? lat),
      home_lon: Number(saved.homeLon ?? lon),
      pos_x: Number(saved.posX ?? 0),
      pos_y: Number(saved.posY ?? 0.9),
      pos_z: Number(saved.posZ ?? 0),
      yaw: Number(saved.yaw ?? 0),
      updated_at: new Date().toISOString(),
    };
  }

  const spawn: SavedPlayerState = {
    id: sessionId,
    home_address: homeAddress,
    home_lat: lat,
    home_lon: lon,
    pos_x: 0,
    pos_y: 0.9,
    pos_z: 0,
    yaw: 0,
    updated_at: new Date().toISOString(),
  };

  await serverSavePlayerState(sessionId, {
    playerId: sessionId,
    homeAddress,
    homeLat: lat,
    homeLon: lon,
    posX: spawn.pos_x,
    posY: spawn.pos_y,
    posZ: spawn.pos_z,
    yaw: spawn.yaw,
  });

  return spawn;
}

export async function savePlayerState(
  id: string,
  pos: { x: number; y: number; z: number },
  yaw: number,
) {
  const existing = await loadPlayerState(id);
  await serverSavePlayerState(id, {
    playerId: id,
    homeAddress: existing?.homeAddress,
    homeLat: existing?.homeLat,
    homeLon: existing?.homeLon,
    posX: pos.x,
    posY: pos.y,
    posZ: pos.z,
    yaw,
  });
}
