# Clamour Web development rules

## Runtime architecture

- Web runtime is PlayCanvas Engine 2.x.
- Unity 6 is the native companion runtime.
- UniversalServer is the shared online authority.
- `shared/gameplay/game-rules.json` is the canonical Web copy of gameplay constants. Do not create a second Web-only ruleset.
- `shared/contracts/client-contract.json` is the canonical Web copy of the cross-client contract.

## Cross-platform invariants

Do not change these independently on Web:

- player identity semantics;
- home-address/world bootstrap semantics;
- persistent player-state field meanings;
- UniversalServer routes;
- gameplay constants that affect parity;
- Street View semantics;
- shared horror-event semantics;
- multiplayer player-state semantics.

When changing a shared gameplay rule, also update the Unity client contract/source and record the parity change in `GAMEPLAY_PARITY.md`.

## PlayCanvas runtime

- Use PlayCanvas Engine as the only Web gameplay renderer/runtime.
- Do not reintroduce Three.js as a second renderer.
- Keep browser UI/DOM/React separate from the gameplay renderer.
- Prefer PlayCanvas entities, components and assets for gameplay runtime state.

## Unity asset pipeline

Unity may author world geometry, characters, vehicles, props and animations.

Export Web runtime art as GLB/glTF with stable node, material and animation names.

Never treat Unity C# scripts, Rigidbody settings, NavMesh data or Unity-only component behaviour as portable Web gameplay code.

Use `playcanvas/IMPORT_MANIFEST.json` and `playcanvas/ASSET_LAYOUT.md` as the import contract.

## Runtime testing

When testing the Web runtime, prefer PlayCanvas MCP + Launch Page over static inspection alone.

Preserve the Launch session when live-link/hot update supports it.

For a runtime bug:

1. observe;
2. reproduce;
3. inspect logs/state;
4. make the smallest fix;
5. live-update or relaunch only if necessary;
6. reproduce the same case;
7. validate a nearby regression case.

Do not “fix” a runtime bug by disabling security, removing error reporting or weakening the UniversalServer contract.

## Secrets

Never commit API keys, bearer tokens, passwords, cookies or private credentials.

## Package management

After changing runtime dependencies, regenerate and commit `package-lock.json` with the project’s supported Node/npm environment before relying on `npm ci`.

## Current PlayCanvas editor connection

- Project ID: `1588287`
- Main Scene ID: `2581837`
- MCP port: `52000`
