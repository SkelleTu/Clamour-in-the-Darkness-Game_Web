/*
# Clamour in the Darkness — game state tables

1. New Tables
   - `clamour_players`: persists each player session's position, home address, and yaw.
     - `id` (text, primary key) — client-generated session identifier
     - `home_address` (text) — player's home address entered on first run
     - `home_lat`, `home_lon` (float8) — geocoded home coordinates
     - `pos_x`, `pos_y`, `pos_z` (float8) — last known world position
     - `yaw` (float8) — last known horizontal look direction
     - `updated_at` (timestamptz) — last autosave timestamp

   - `clamour_horror_events`: shared horror manifestation events visible to all players.
     - `id` (uuid, primary key)
     - `player_id` (text) — session that triggered the event
     - `pos_x`, `pos_y`, `pos_z` (float8) — world position of the manifestation
     - `created_at` (timestamptz)

2. Security
   - RLS enabled on both tables.
   - Both tables use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
     because this is a shared-world game with no private-per-user ownership model.
     All connected players share world state intentionally.
*/

CREATE TABLE IF NOT EXISTS clamour_players (
  id           text PRIMARY KEY,
  home_address text NOT NULL DEFAULT '',
  home_lat     float8 NOT NULL DEFAULT -22.3572,
  home_lon     float8 NOT NULL DEFAULT -47.3841,
  pos_x        float8 NOT NULL DEFAULT 0,
  pos_y        float8 NOT NULL DEFAULT 0.9,
  pos_z        float8 NOT NULL DEFAULT 0,
  yaw          float8 NOT NULL DEFAULT 0,
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE clamour_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_players" ON clamour_players;
CREATE POLICY "anon_select_players" ON clamour_players FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_players" ON clamour_players;
CREATE POLICY "anon_insert_players" ON clamour_players FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_players" ON clamour_players;
CREATE POLICY "anon_update_players" ON clamour_players FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_players" ON clamour_players;
CREATE POLICY "anon_delete_players" ON clamour_players FOR DELETE
  TO anon, authenticated USING (true);


CREATE TABLE IF NOT EXISTS clamour_horror_events (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id text NOT NULL DEFAULT '',
  pos_x     float8 NOT NULL DEFAULT 0,
  pos_y     float8 NOT NULL DEFAULT 0,
  pos_z     float8 NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clamour_horror_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_horror" ON clamour_horror_events;
CREATE POLICY "anon_select_horror" ON clamour_horror_events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_horror" ON clamour_horror_events;
CREATE POLICY "anon_insert_horror" ON clamour_horror_events FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_horror" ON clamour_horror_events;
CREATE POLICY "anon_delete_horror" ON clamour_horror_events FOR DELETE
  TO anon, authenticated USING (true);
