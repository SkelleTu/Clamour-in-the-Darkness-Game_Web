import "dotenv/config";
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import app from "./app";
import { logger } from "./lib/logger";
import { initPGlite, pgFlushPersistence } from "./lib/pglite";

// The embedded server may be started with the workspace root as cwd or with
// universal-server as cwd. Load the same local .env in both cases.
const rootEnvPath = path.resolve(process.cwd(), "universal-server", ".env");
const cwdEnvPath = path.resolve(process.cwd(), ".env");
if (existsSync(rootEnvPath)) loadDotenv({ path: rootEnvPath, override: false });
if (existsSync(cwdEnvPath)) loadDotenv({ path: cwdEnvPath, override: false });

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

if (!process.env.GOOGLE_MAPS_API_KEY?.trim()) {
  logger.warn("GOOGLE_MAPS_API_KEY is not configured; Google Places/Street View requests will fail.");
}

(async () => {
  try {
    await initPGlite();
    const server = app.listen(port, "0.0.0.0", () => {
      logger.info(
        {
          host: "0.0.0.0",
          port,
          database: "github",
          persistentDatabase: true,
          googleMapsConfigured: Boolean(process.env.GOOGLE_MAPS_API_KEY?.trim()),
        },
        "Universal Server listening",
      );
    });

    let shuttingDown = false;
    const gracefulShutdown = async (signal: string) => {
      if (shuttingDown) return;
      shuttingDown = true;
      logger.info({ signal }, "Graceful shutdown requested");
      try {
        await pgFlushPersistence(signal);
      } catch (err) {
        logger.error({ err, signal }, "Final GitHub database flush failed");
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
      process.exit(0);
    };

    process.once("SIGTERM", () => void gracefulShutdown("SIGTERM"));
    process.once("SIGINT", () => void gracefulShutdown("SIGINT"));
  } catch (err) {
    logger.error({ err }, "Failed to initialize GitHub database");
    process.exit(1);
  }
})();
