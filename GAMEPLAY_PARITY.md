# Clamour Runtime Parity

Clamour is one game with multiple runtimes. Web and Unity are clients of the same gameplay specification and the same Universal Server state.

## Canonical sources

- Shared gameplay rules: `shared/gameplay/game-rules.json`
- Shared client/server contract: `shared/contracts/client-contract.json`
- UniversalServer: authoritative online identity and persistent player state
- Unity 6: native runtime
- PlayCanvas Engine 2.x: browser runtime

The Web runtime must not become a simplified or alternate game.

## Invariants

- Same Araras world origin and address-based initial spawn.
- Same movement numbers: walk 3.8, sprint 6.2, acceleration 18, deceleration 22, gravity -24, jump height 1.45.
- Same collision/stumble thresholds and carry-weight movement modifier.
- Same stamina/health rules.
- Same camera feel parameters for bob, landing and stumble response.
- Same inventory and object-interaction rules.
- Same first/second/third-person perspective states as they are implemented in the shared gameplay contract.
- Same player persistence semantics: first spawn from home, subsequent sessions resume from last saved position.
- Same passive Street View concept: Street View supplies world imagery while Clamour owns movement, camera and interaction.
- Same real-world weather and celestial-time synchronization through UniversalServer.
- Same personal/shared horror-event semantics.
- Same multiplayer player-state and shared-event semantics.
- Same maintenance/expiration behavior supplied by UniversalServer.

## Platform difference

Only the rendering/runtime implementation may differ:

- Native: Unity 6 + Unity native systems.
- Web: PlayCanvas Engine 2.x + browser/Web APIs.
- Server: UniversalServer remains shared and authoritative.

## Asset parity

World art is authored in Unity when convenient and delivered to Web through the PlayCanvas asset pipeline, preferably GLB/glTF. Node names, material names and animation names are stable identifiers. Unity gameplay scripts, Unity Rigidbody settings and Unity NavMesh data are not treated as portable runtime logic.

## Cross-platform synchronization

A player may move from Web to Unity without creating a second account/game identity. The canonical `playerId` and persistent player state are supplied by UniversalServer. The clients may have different local rendering and input systems, but they must resolve to the same gameplay state and server contract.
