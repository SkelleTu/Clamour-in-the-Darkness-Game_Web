import { login, register, validateSession, persistAuth, clearAuth, type AuthSession } from '@/lib/universalServer';
import { geocodeAddress, searchAddresses, createPlacesSessionToken, type AddressSuggestion } from '@/game/persistence';
import { ensurePlayCanvasGameAPI, type PlayCanvasSpawnOptions, type PlayCanvasSession } from './gameApi';
import type { AddressEntry, LoginPayload, RegisterPayload, AuthResult, AddressLookupResult } from './contract';

export async function doLogin(payload: LoginPayload): Promise<AuthResult> {
  try {
    const session = await login(payload.username, payload.password);
    return { status: 'ok', session };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Não foi possível entrar.' };
  }
}

export async function doRegister(payload: RegisterPayload): Promise<AuthResult> {
  if (payload.password !== payload.confirmPassword) {
    return { status: 'error', message: 'As senhas não coincidem.' };
  }
  try {
    const session = await register(payload.username, payload.password);
    return { status: 'ok', session };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Não foi possível criar a conta.' };
  }
}

export async function doLookupAddress(query: string): Promise<AddressSuggestion[]> {
  if (query.trim().length < 3) return [];
  return searchAddresses(query, createPlacesSessionToken());
}

export async function doConfirmAddress(entry: AddressEntry): Promise<AddressLookupResult> {
  const normalized = await geocodeAddress(entry.displayName);
  if (!normalized) {
    return { status: 'error', message: 'Não foi possível confirmar esse endereço para spawn.' };
  }
  return { status: 'ok', address: entry.displayName, lat: normalized.lat, lon: normalized.lon };
}

export function applySession(session: AuthSession | null): PlayCanvasSession {
  if (!session) {
    clearAuth();
    return { auth: null, playerId: null, username: null };
  }
  persistAuth(session);
  return { auth: session, playerId: session.playerId, username: session.username };
}

export async function startPlayCanvasSession(options: PlayCanvasSpawnOptions): Promise<void> {
  const api = ensurePlayCanvasGameAPI();
  await api.start(options);
}

export async function restoreSession(): Promise<PlayCanvasSession | null> {
  const session = await validateSession();
  if (!session) return null;
  return applySession(session);
}
