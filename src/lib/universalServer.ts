const DEFAULT_US_URL = '/us';

export const UNIVERSAL_SERVER_URL = String(
  import.meta.env.VITE_UNIVERSAL_SERVER_URL ?? DEFAULT_US_URL,
).replace(/\/$/, '');

const TOKEN_KEY = 'clamour_auth_token';
const PLAYER_KEY = 'clamour_player_id';
const USERNAME_KEY = 'clamour_username';

type ApiErrorPayload = { error?: string };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const apiKey = import.meta.env.VITE_UNIVERSAL_SERVER_API_KEY;
  if (apiKey && !headers.has('x-api-key')) headers.set('x-api-key', apiKey);

  const response = await fetch(`${UNIVERSAL_SERVER_URL}${path}`, { ...init, headers });
  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'object' && payload
      ? String((payload as ApiErrorPayload).error ?? `HTTP ${response.status}`)
      : `HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export type AuthSession = {
  token: string;
  playerId: string;
  username: string;
};

export type StreetViewMetadata = {
  status: string;
  pano: string;
  location: { lat: number; lng: number };
  date: string | null;
  copyright: string | null;
};

export type PlayerState = {
  playerId: string;
  homeAddress?: string;
  homeLat?: number;
  homeLon?: number;
  posX: number;
  posY: number;
  posZ: number;
  yaw: number;
};

export function persistAuth(session: AuthSession) {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(PLAYER_KEY, session.playerId);
  localStorage.setItem(USERNAME_KEY, session.username);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PLAYER_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

export function getStoredAuth() {
  const token = localStorage.getItem(TOKEN_KEY);
  const playerId = localStorage.getItem(PLAYER_KEY);
  const username = localStorage.getItem(USERNAME_KEY);
  return token && playerId && username ? { token, playerId, username } : null;
}

export async function register(username: string, password: string): Promise<AuthSession> {
  const result = await request<AuthSession & { requiresHome?: boolean }>('/api/game/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  const session = { token: result.token, playerId: result.playerId, username: result.username };
  persistAuth(session);
  return session;
}

export async function login(username: string, password: string): Promise<AuthSession> {
  const result = await request<AuthSession>('/api/game/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  persistAuth(result);
  return result;
}

export async function validateSession(): Promise<AuthSession | null> {
  const stored = getStoredAuth();
  if (!stored) return null;
  try {
    const result = await request<{ ok: true; playerId: string; username: string }>('/api/game/auth/session');
    const session = { token: stored.token, playerId: result.playerId, username: result.username };
    persistAuth(session);
    return session;
  } catch {
    clearAuth();
    return null;
  }
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const response = await fetch(
      `${UNIVERSAL_SERVER_URL}/api/game/google/geocode?address=${encodeURIComponent(address)}`,
      { headers: { Accept: 'application/json' } },
    );
    if (!response.ok) return null;
    const payload = await response.json();
    const location = payload?.results?.[0]?.geometry?.location;
    if (!location || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) return null;
    return { lat: Number(location.lat), lon: Number(location.lng) };
  } catch {
    return null;
  }
}

export async function searchAddresses(query: string) {
  const result = await geocodeAddress(query);
  return result ? [{ displayName: query, lat: result.lat, lon: result.lon }] : [];
}

export async function getStreetViewMetadata(lat: number, lon: number): Promise<StreetViewMetadata> {
  const response = await request<{ data: StreetViewMetadata }>(
    `/api/game/streetview/metadata?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lon)}&radius=100`,
  );
  return response.data;
}

export function streetViewImageUrl(options: {
  pano: string;
  lat: number;
  lon: number;
  heading: number;
  pitch?: number;
  fov?: number;
  width?: number;
  height?: number;
}) {
  const params = new URLSearchParams({
    pano: options.pano,
    lat: String(options.lat),
    lng: String(options.lon),
    heading: String(options.heading),
    pitch: String(options.pitch ?? 0),
    fov: String(options.fov ?? 90),
    width: String(options.width ?? 640),
    height: String(options.height ?? 640),
  });
  return `${UNIVERSAL_SERVER_URL}/api/game/streetview/image?${params.toString()}`;
}

export async function loadPlayerState(playerId: string): Promise<PlayerState | null> {
  try {
    const result = await request<{ found: boolean; state: Partial<PlayerState> | null }>(
      `/api/game/auth/player-state/${encodeURIComponent(playerId)}`,
    );
    if (!result.found || !result.state) return null;
    return result.state as PlayerState;
  } catch {
    return null;
  }
}

export async function savePlayerState(playerId: string, state: PlayerState) {
  await request(`/api/game/auth/player-state/${encodeURIComponent(playerId)}`, {
    method: 'PUT',
    body: JSON.stringify(state),
  });
}
