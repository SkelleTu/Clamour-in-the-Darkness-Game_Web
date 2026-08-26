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

## PlayCanvas Editor source packaging

The PlayCanvas Editor is not a generic Vite/React/TypeScript runtime.

- NEVER import the repository's entire `src/` tree into PlayCanvas as Script Assets.
- NEVER import `.ts` or `.tsx` source files into the PlayCanvas Editor as gameplay scripts.
- NEVER attach React components such as `App.tsx`, `AddressPrompt.tsx`, `HUD.tsx` or `TouchControls.tsx` as PlayCanvas Script Assets.
- NEVER attach Vite entry points such as `main.tsx` as PlayCanvas Script Assets.
- NEVER attach backend/client-library implementation files such as Supabase or generic service modules merely because they exist under `src/`.
- Browser UI code remains outside the PlayCanvas gameplay scene.
- PlayCanvas Editor gameplay scripts must be packaged as PlayCanvas-supported `.mjs` ESM Script Assets or `.js` Classic Script Assets.
- For modern PlayCanvas gameplay, prefer `.mjs` ESM Script Assets.
- ESM gameplay modules may use `import`/`export`, but the files imported into the Editor must themselves be valid `.mjs` assets and imports must resolve through the PlayCanvas asset/module system.
- Do not rename a `.ts` file to `.mjs` without actually converting/removing TypeScript syntax and fixing module paths.
- Do not copy Vite path aliases such as `@/game/...` into PlayCanvas ESM assets unless an explicit PlayCanvas import map resolves them.
- Do not copy React, JSX, Tailwind, Vite-only environment syntax or bundler-only assumptions into PlayCanvas Script Assets.
- Keep PlayCanvas-specific runtime source in an explicit import/export surface such as `playcanvas/scripts/` or an equivalent clearly documented directory.
- Use PlayCanvas's source/asset synchronization workflow or the Editor's Script Assets for the `.mjs`/`.js` runtime surface; use MCP for Editor attachments, attributes, scene entities and launch verification.
- A successful Git/Vite build is not evidence that the Editor can execute the same source files directly.

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

## Long-running work and retry resilience

This repository is intended to support long-running imports, migrations, PlayCanvas asset processing and runtime validation. Transient tool failures must not be treated as final task failures.

### Retryable failures

Treat the following as retryable unless there is evidence of a permanent cause:

- HTTP 408
- HTTP 425
- HTTP 429
- HTTP 500
- HTTP 502
- HTTP 503
- HTTP 504
- `Upstream idle timeout exceeded`
- upstream/gateway timeout errors
- `connection reset`
- `connection closed`
- `socket hang up`
- `ECONNRESET`
- `ETIMEDOUT`
- network timeout/unavailable errors
- transient MCP failures
- transient PlayCanvas MCP failures
- transient browser automation failures
- transient upload/import failures

If a tool error explicitly contains `isRetryable: true`, treat it as retryable.

### Retry policy

When a retryable failure occurs:

1. Do not abandon the overall task.
2. Do not report the stage as permanently failed.
3. Preserve the last confirmed progress point.
4. Determine whether the operation completed partially before retrying.
5. Wait using progressive backoff:
   - attempt 1: 2 seconds;
   - attempt 2: 5 seconds;
   - attempt 3: 10 seconds;
   - attempt 4: 20 seconds;
   - attempt 5: 30 seconds;
   - subsequent attempts: up to 60 seconds between retries.
6. Retry the smallest failed operation possible.
7. Verify the result before advancing.
8. Continue from the last confirmed checkpoint.

If the service remains temporarily unavailable, continue retrying periodically rather than abandoning a long-running task, unless the environment explicitly terminates the session.

### Idempotency and duplicate protection

Before repeating creation, import, upload or modification operations:

- check whether the operation already succeeded;
- do not duplicate assets;
- do not duplicate entities;
- do not duplicate files;
- do not create duplicate PlayCanvas imports;
- prefer stable asset names, IDs, hashes or checkpoints when available.

When an operation is not safely idempotent, inspect state first and recover from the last confirmed result instead of blindly repeating it.

### Long-running asset imports

Do not treat a large import as one monolithic operation.

Process assets in small, recoverable batches when practical.

For each batch:

1. identify the batch;
2. import/process it;
3. verify completion;
4. record progress;
5. continue to the next batch.

If a single asset fails, retry that asset or the smallest affected batch instead of restarting the entire import.

### Progress checkpoints

Maintain a durable progress record whenever the task is long-running. The progress state should include, when applicable:

- current stage;
- last completed stage;
- current batch;
- last successfully imported asset;
- last successfully processed file;
- last error;
- retry count;
- last retry timestamp;
- next intended action.

A retry must resume from the last confirmed point.

### MCP recovery

If PlayCanvas MCP disconnects or a tool call fails temporarily:

1. verify whether the PlayCanvas Editor is still open;
2. verify whether the MCP server is still listening;
3. reconnect the MCP if necessary;
4. preserve the current project and Launch state whenever possible;
5. retry the failed operation;
6. continue the task after recovery.

Do not restart the complete project as the first response to a transient MCP failure.

### Launch and browser recovery

If Launch or browser automation fails transiently:

- retry the operation;
- preserve the current Launch session when possible;
- confirm whether the runtime is still alive before relaunching;
- only perform a full restart when incremental recovery fails or a clean restart is technically required.

### Permanent failures

Stop and request human intervention only when:

- the error is clearly non-retryable;
- repeated retries establish a persistent permanent failure;
- credentials/permissions are missing and cannot be resolved automatically;
- continuing could corrupt the project or assets;
- a required architectural decision cannot be inferred safely.

### Continuation rule

The default response to a transient failure is:

`RETRY -> VERIFY -> CHECKPOINT -> CONTINUE`

not:

`FAIL -> STOP`

A tool timeout does not mean that the underlying operation failed. Always verify the actual repository/PlayCanvas state before deciding to repeat or roll back work.

## Secrets

Never commit API keys, bearer tokens, passwords, cookies or private credentials.

## Package management

After changing runtime dependencies, regenerate and commit `package-lock.json` with the project’s supported Node/npm environment before relying on `npm ci`.

## Current PlayCanvas editor connection

- Project ID: `1588287`
- Main Scene ID: `2581837`
- MCP port: `52001`
