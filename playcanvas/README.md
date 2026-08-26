# Clamour Web / PlayCanvas Runtime

This directory defines the Web runtime contract for the Clamour project.

## Platform model

- Unity 6 is the native client/runtime.
- PlayCanvas Engine 2.x is the Web client/runtime.
- UniversalServer is the shared online authority.
- Shared gameplay rules and client contracts live under `shared/`.

The Web client must never become a second game with a second identity system or a second gameplay database.

## Editor import boundary

The PlayCanvas Editor is **not** the Vite/React/TypeScript runtime.

Only the explicit PlayCanvas runtime surface may be imported into the Editor as Script Assets:

```text
playcanvas/scripts/
  clamour-runtime.mjs   <- entrypoint
  input.mjs
  player.mjs
  world.mjs
```

Rules:

- Import `.mjs` ESM Script Assets for modern gameplay code.
- Do not import `src/` as Script Assets.
- Do not import `.ts` or `.tsx` files as Script Assets.
- Do not attach React/Vite UI files to PlayCanvas entities.
- Do not rename TypeScript files to `.mjs` without converting them to real JavaScript ESM.
- Do not copy Vite aliases such as `@/game/...` into Editor scripts.
- Keep React/Vite browser UI outside the PlayCanvas gameplay scene.

`playcanvas/IMPORT_MANIFEST.json` is the source of truth for this boundary.

## Import pipeline

1. Build and author world geometry, characters, props and animation in Unity.
2. Export runtime-ready assets as GLB/glTF with stable node, material and animation names.
3. Import the assets into the PlayCanvas project.
4. Import only the PlayCanvas ESM runtime surface from `playcanvas/scripts/`.
5. Keep collision, interaction, networking and gameplay logic in the PlayCanvas runtime rather than attempting to import Unity C# behaviour.
6. Use the same shared gameplay contract and UniversalServer state as Unity.

## Runtime

The PlayCanvas runtime is responsible for:

- rendering;
- browser input;
- physics/collision implementation;
- animation playback;
- camera;
- interaction;
- scene streaming;
- Street View presentation;
- client-side gameplay implementation;
- UniversalServer integration.

The Unity runtime implements the same gameplay contract with native Unity systems.

## Synchronization rule

A player may switch between Web and Unity without creating a new game identity. The UniversalServer-issued `playerId` is authoritative and persistent state is stored on the UniversalServer.

See:

- `../shared/contracts/client-contract.json`
- `../shared/gameplay/game-rules.json`
- `../CLAMOUR_CLIENT_CONTRACT.md`
- `../GAMEPLAY_PARITY.md`
- `./IMPORT_MANIFEST.json`
