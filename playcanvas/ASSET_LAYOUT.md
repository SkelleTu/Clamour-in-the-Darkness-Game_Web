# PlayCanvas asset layout

The Web runtime consumes assets authored for the Clamour project through the PlayCanvas import pipeline.

Recommended Git/source layout:

```text
assets/
  source/
    world/
    characters/
    vehicles/
    props/
    animation/
  web/
    world/
    characters/
    vehicles/
    props/
    animation/
```

`assets/source` is the authoring-side export surface. Unity is allowed to remain the source authoring tool for scene composition, modelling and animation.

`assets/web` contains runtime-ready GLB/glTF and texture files only when they are intentionally versioned in Git. Large production assets may instead live in the PlayCanvas project asset store and be referenced by stable asset/template IDs.

## Naming

Use stable, semantic names:

- `BLDG_*` buildings
- `ROAD_*` roads
- `PROP_*` props
- `DOOR_*` doors
- `VEH_*` vehicles
- `CHAR_*` characters
- `SPAWN_NPC_*` NPC spawn points
- `SPAWN_PLAYER` player spawn
- `TRIGGER_*` gameplay triggers
- `INTERACT_*` interaction points

The name is part of the cross-runtime asset contract. Do not rename nodes casually after they have gameplay references.

## Import rules

- Prefer GLB for final Web delivery.
- Preserve node, material and animation names.
- Keep world zones separate rather than importing the city as one monolith.
- Do not import Unity C# gameplay as Web runtime logic.
- Do not rely on Unity Rigidbody/NavMesh data as the Web physics/navigation implementation.
- Add PlayCanvas templates/components after import for Web-specific runtime behavior.

PlayCanvas imports a GLB into a container/template/render hierarchy and preserves matching node names during model updates. That lets a source model be replaced without unnecessarily breaking gameplay overrides.
