# Clamour in the Darkness — Web / PlayCanvas Runtime

This repository is the browser client of Clamour in the Darkness.

## Runtime architecture

- **Web runtime:** PlayCanvas Engine 2.x + TypeScript/Vite.
- **Native runtime:** Unity 6 in the companion Unity repository.
- **Online authority:** UniversalServer, hosted separately on Replit.
- **Shared contracts:** `shared/contracts/` and `shared/gameplay/`.
- **3D asset bridge:** Unity-authored GLB/glTF imported into PlayCanvas.

The Web client is not a simplified second game. It implements the same gameplay contract, identity and persistent state as the Unity client.

## Important rules

1. UniversalServer is the single authoritative online backend.
2. Web and Unity do not create separate player identities or separate gameplay databases.
3. `shared/gameplay/game-rules.json` is the canonical source for gameplay constants used by the Web runtime.
4. Unity can remain the authoring tool for world geometry, models, animations and art. Export runtime-ready assets as GLB/glTF for PlayCanvas.
5. Unity C# behaviours, Unity Rigidbody/NavMesh data and Unity-specific scene logic are not imported as Web gameplay logic.
6. The browser renderer is PlayCanvas. Do not reintroduce Three.js as another runtime renderer.
7. Large worlds are divided into stable zones instead of one monolithic asset.

## Development

```bash
npm install
npm run dev
```

The first `npm install` after the PlayCanvas migration intentionally regenerates `package-lock.json` so the new `playcanvas` dependency is locked for the current machine/Node environment.

## PlayCanvas

The project is designed to be used with a PlayCanvas Editor project and its MCP integration. The Editor-side project owns imported scene/template assets; this repository owns the runtime code, shared contracts and import conventions.

Current PlayCanvas project bootstrap documented for this work:

- projectId: `1588287`
- main scene: `Main Scene` (`2581837`)
- MCP port: `52000`

See `playcanvas/` for the asset import and runtime conventions.

## Unity parity

The Web and Unity clients must continue to share:

- authentication identity;
- home address / geocode result;
- player position and yaw persistence;
- gameplay constants;
- Street View semantics;
- network event semantics;
- UniversalServer API routes.

See `CLAMOUR_CLIENT_CONTRACT.md` and `GAMEPLAY_PARITY.md`.
