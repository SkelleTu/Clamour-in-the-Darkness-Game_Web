import { supabase } from '@/lib/supabase';
import { RULES } from './rules';

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

export async function loadOrCreatePlayer(sessionId: string, homeAddress: string, lat: number, lon: number): Promise<SavedPlayerState> {
  const { data, error } = await supabase
    .from('clamour_players')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (data) return data as SavedPlayerState;

  const spawn: SavedPlayerState = {
    id: sessionId,
    home_address: homeAddress,
    home_lat: lat,
    home_lon: lon,
    pos_x: 0,
    pos_y: RULES.movement.controllerHeight / 2,
    pos_z: 0,
    yaw: 0,
    updated_at: new Date().toISOString(),
  };

  await supabase.from('clamour_players').upsert(spawn);
  return spawn;
}

export async function savePlayerState(
  id: string,
  pos: { x: number; y: number; z: number },
  yaw: number,
) {
  await supabase.from('clamour_players').update({
    pos_x: pos.x, pos_y: pos.y, pos_z: pos.z, yaw,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
}

export async function getSharedHorrorEvents(sinceMs = 5000) {
  const since = new Date(Date.now() - sinceMs).toISOString();
  const { data } = await supabase
    .from('clamour_horror_events')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(RULES.network.eventLimit);
  return data ?? [];
}

export async function broadcastHorrorEvent(
  playerId: string,
  x: number,
  y: number,
  z: number,
) {
  await supabase.from('clamour_horror_events').insert({
    player_id: playerId,
    pos_x: x, pos_y: y, pos_z: z,
  });
}
