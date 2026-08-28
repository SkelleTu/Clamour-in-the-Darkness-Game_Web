import * as THREE from 'three';
import { UNIVERSAL_SERVER_URL, type AuthSession } from '@/lib/universalServer';

export type PlayCanvasSession = {
  auth: AuthSession | null;
  playerId: string | null;
  username: string | null;
};

export type PlayCanvasSpawnOptions = {
  address: string;
  lat: number;
  lon: number;
  yaw: number;
};

export type PlayCanvasGameAPI = {
  session: PlayCanvasSession;
  start(options: PlayCanvasSpawnOptions): Promise<void>;
  logout(): void;
};

let api: PlayCanvasGameAPI | null = null;

export function getPlayCanvasGameAPI(): PlayCanvasGameAPI | null {
  return api;
}

export function setPlayCanvasGameAPI(next: PlayCanvasGameAPI | null) {
  api = next;
}

export function ensurePlayCanvasGameAPI(): PlayCanvasGameAPI {
  if (!api) throw new Error('PlayCanvas game API is not initialized');
  return api;
}
