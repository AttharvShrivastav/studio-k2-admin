import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { existsSync } from "node:fs";
import path from "node:path";
import { env } from "./lib/env.js";
import { authRoutes } from "./routes/auth.js";
import { healthRoutes } from "./routes/health.js";
import { projectEditorRoutes } from "./routes/project-editor.js";
import { projectRoutes } from "./routes/projects.js";
import { publicProjectRoutes } from "./routes/public-projects.js";
import { uploadRoutes } from "./routes/uploads.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
    },
    trustProxy: true,
  });

  await app.register(cors, {
    origin: [...new Set([env.ADMIN_ORIGIN, env.PUBLIC_SITE_ORIGIN])],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  await app.register(multipart, { limits: { files: 500, fileSize: 10 * 1024 * 1024, parts: 510 } });

  await app.register(healthRoutes, { prefix: "/api" });
  await app.register(authRoutes, { prefix: "/api" });
  await app.register(projectRoutes, { prefix: "/api/admin" });
  await app.register(projectEditorRoutes, { prefix: "/api/admin" });
  await app.register(publicProjectRoutes, { prefix: "/api/public" });
  await app.register(uploadRoutes, { prefix: "/api" });

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
