import type { FastifyPluginAsync } from "fastify";
import type { HealthResponse } from "../../shared/types/api.js";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: HealthResponse }>("/health", async () => ({ ok: true }));
};
