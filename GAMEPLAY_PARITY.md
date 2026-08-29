# Clamour Web Runtime Parity

The web runtime is not a simplified or alternate game. It is a browser runtime of the same Clamour gameplay specification.

## Invariants

- Same Araras world origin and address-based initial spawn.
- Same player movement numbers: walk 3.8, sprint 6.2, acceleration 18, deceleration 22, gravity -24, jump height 1.45.
- Same collision/stumble thresholds and carry-weight movement modifier.
- Same stamina/health rules.
- Same camera feel parameters for bob, landing and stumble response.
- Same inventory and object-interaction rules.
- Same first/second/third-person perspective states.
- Same player persistence semantics: first spawn from home, subsequent sessions resume from last saved position.
- Same passive Street View concept: Street View supplies world imagery while Clamour owns movement, camera and interaction.
- Same real-world weather and celestial time synchronization through the Universal Server.
- Same personal/shared horror event semantics.
- Same multiplayer player-state and shared-event transport.
- Same maintenance/expiration behavior supplied by the Universal Server.

## Platform difference

Only the runtime implementation changes:
- Native: Unity 6 runtime.
- Web: TypeScript/WebGL/Web APIs in a browser.

Gameplay state, rules, server contracts and persistence semantics must not diverge between the two runtimes.
