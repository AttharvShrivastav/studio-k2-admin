import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { existsSync } from "node:fs";
import path from "node:path";
import { env } from "./lib/env.js";
import { authRoutes } from "./routes/auth.js";
import { healthRoutes } from "./routes/health.js";
import { projectRoutes } from "./routes/projects.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
    },
    trustProxy: true,
  });

  await app.register(cors, {
    origin: env.ADMIN_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  await app.register(healthRoutes, { prefix: "/api" });
  await app.register(authRoutes, { prefix: "/api" });
  await app.register(projectRoutes, { prefix: "/api/admin" });

  const clientDirectory = path.resolve(process.cwd(), "dist/client");
  if (existsSync(clientDirectory)) {
    await app.register(fastifyStatic, {
      root: clientDirectory,
      prefix: "/",
      wildcard: false,
    });

    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api/")) {
        return reply.status(404).send({ error: "Not found" });
      }

      return reply.sendFile("index.html");
    });
  }

  return app;
}
