# Unity ↔ Web synchronization

The Web repository owns the canonical cross-runtime contract for this migration while the Unity repository remains the native runtime.

## Canonical files

- `shared/gameplay/game-rules.json`
- `shared/contracts/client-contract.json`

## Unity rule

The Unity runtime must consume the same values/semantics from these files, directly or through a generated C# representation. Do not hand-copy gameplay constants into unrelated Unity-only values.

## Recommended Unity integration

Use a small generation/import step that converts the shared JSON into strongly typed C# data used by the Unity runtime. The generated file must be treated as generated output and must never become an independent source of truth.

The generated Unity data should cover at minimum:

- movement speeds and acceleration/deceleration;
- gravity and jump height;
- controller dimensions;
- stumble thresholds;
- camera feel values;
- health/stamina values;
- interaction keys/actions;
- Street View request semantics;
- persistence timing;
- multiplayer limits/timers;
- horror event timings.

## Persistent state parity

Both runtimes must send and load the same logical player fields through UniversalServer:

- playerId
- homeAddress
- homeLat
- homeLon
- posX
- posY
- posZ
- yaw

Unity may store only local session credentials/state needed for the native client, but UniversalServer remains authoritative for shared persistent gameplay state.

## Asset parity

Unity is the authoring side for 3D art. Web imports runtime-ready GLB/glTF into PlayCanvas. Stable semantic node names are shared identifiers across runtimes.

Unity C# scripts and Unity-specific engine components remain native implementations. They are not exported into the Web runtime.
