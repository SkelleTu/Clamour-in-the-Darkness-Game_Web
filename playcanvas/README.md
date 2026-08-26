# Clamour Web / PlayCanvas Runtime

This directory defines the Web runtime contract for the Clamour project.

## Platform model

- Unity 6 is the native client/runtime.
- PlayCanvas Engine 2.x is the Web client/runtime.
- UniversalServer is the shared online authority.
- Shared gameplay rules and client contracts live under `shared/`.

The Web client must never become a second game with a second identity system or a second gameplay database.

## Import pipeline

1. Build and author world geometry, characters, props and animation in Unity.
2. Export runtime-ready assets as GLB/glTF with stable node, material and animation names.
3. Import the assets into the PlayCanvas project.
4. Keep collision, interaction, networking and gameplay logic in the PlayCanvas runtime rather than attempting to import Unity C# behaviour.
5. Use the same shared gameplay contract and UniversalServer state as Unity.

## Asset rules

- Prefer GLB for model delivery.
- Keep the map divided into address/world zones instead of a single monolith.
- Preserve node names.
- Preserve material names.
- Preserve animation names.
- Keep gameplay-independent art separate from runtime scripts.
- Never treat Unity prefabs, C# components, Rigidbody settings or NavMesh data as portable game logic.

## Runtime rules

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
