# Clamour client contract

Web and Unity are two clients of the same game. They must never create separate player identities or separate gameplay databases.

## Canonical architecture

- Web runtime: PlayCanvas Engine 2.x in the browser.
- Native runtime: Unity 6.
- Online authority: UniversalServer on Replit.
- Shared gameplay rules: `shared/gameplay/game-rules.json`.
- Shared client contract: `shared/contracts/client-contract.json`.

## Shared Universal Server

Both clients use the same Universal Server base URL and the same API routes.

### Authentication

- `POST /api/game/auth/register`
- `POST /api/game/auth/login`
- `GET /api/game/auth/session`

### World bootstrap

- `GET /api/game/google/geocode?address=...`
- `GET /api/game/streetview/metadata?lat=...&lng=...&radius=100`
- `GET /api/game/streetview/image?pano=...&lat=...&lng=...&heading=...&pitch=...&fov=...&width=...&height=...`

### Player persistence

- `GET /api/game/auth/player-state/:playerId`
- `PUT /api/game/auth/player-state/:playerId`

## Identity rule

UniversalServer returns the canonical `playerId`. Web stores the authenticated player identity locally for session continuity; Unity stores it in PlayerPrefs. Neither runtime invents a replacement identity after authentication.

## Address rule

The address is geocoded through UniversalServer. The resulting coordinates are canonical for the player's home. Street View metadata is then resolved near those coordinates.

## Spawn rule

The client resolves Street View near the canonical home coordinates and computes the initial yaw consistently. Any runtime-specific coordinate conversion must preserve the same logical world position.

## State rule

Position, yaw, home address and other persistent gameplay state are persisted through UniversalServer. Switching between Web and Unity must load the same server state.

## Gameplay rule

The clients may implement rendering, input, physics and animation differently, but those implementations must obey the same shared gameplay contract. Do not fork core rules into unrelated Web-only or Unity-only definitions.

## Asset rule

3D art can be authored in Unity and exported as GLB/glTF for the PlayCanvas Web runtime. Stable node/material/animation names are part of the asset contract. Unity C# gameplay scripts, Rigidbody settings and NavMesh data are not imported as Web gameplay logic.

## Web runtime rule

The Web client is PlayCanvas-first. Three.js must not be reintroduced as a second rendering engine. Browser UI may remain React/DOM, while the gameplay renderer and scene runtime are owned by PlayCanvas.
