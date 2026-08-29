# Clamour client contract

Web and Unity are two clients of the same game. They must never create separate player identities or separate gameplay databases.

## Shared Universal Server

Both clients use the same Universal Server base URL and the same API routes.

Authentication:
- POST /api/game/auth/register
- POST /api/game/auth/login
- GET /api/game/auth/session

World bootstrap:
- GET /api/game/google/geocode?address=...
- GET /api/game/streetview/metadata?lat=...&lng=...&radius=100
- GET /api/game/streetview/image?pano=...&lat=...&lng=...&heading=...&pitch=...&fov=...&width=...&height=...

Player persistence:
- GET /api/game/auth/player-state/:playerId
- PUT /api/game/auth/player-state/:playerId

## Identity rule

The Universal Server returns the canonical `playerId`. Web stores it in local storage; Unity stores it in PlayerPrefs. Neither client invents a different player ID after authentication.

## Address rule

The address is geocoded through the Universal Server. The resulting coordinates are the canonical home location. Street View metadata is then resolved near those coordinates.

## Spawn rule

The client spawns the player at the resolved Street View location and computes the initial yaw from the Street View point toward the geocoded home address. This keeps the first view aligned across Web and Unity.

## State rule

Position, yaw and home address are persisted to the Universal Server. Switching between Web and Unity must load the same player state.

## Platform rule

Web and Unity may use different rendering/input implementations, but gameplay data, identity, address, server endpoints and persistent player state are shared. Do not fork game logic into unrelated backends.
