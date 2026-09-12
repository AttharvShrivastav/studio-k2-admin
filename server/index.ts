import { buildApp } from "./app.js";
import {
  closeDatabaseConnection,
  verifyDatabaseConnection,
} from "./db/index.js";
import { env } from "./lib/env.js";

const app = await buildApp();

async function shutdown(signal: string) {
  app.log.info({ signal }, "Shutting down");
  await app.close();
  await closeDatabaseConnection();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await verifyDatabaseConnection();
  app.log.info("PostgreSQL connection verified");
  await app.listen({ host: "0.0.0.0", port: env.PORT });
} catch (error) {
  app.log.error(error, "Server startup failed");
  await closeDatabaseConnection();
  process.exit(1);
}
