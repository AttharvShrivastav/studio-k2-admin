import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth/index.js";

function toWebRequest(request: FastifyRequest) {
  const protocol = request.protocol;
  const host = request.headers.host ?? "localhost";
  const url = new URL(request.raw.url ?? request.url, `${protocol}://${host}`);
  const headers = fromNodeHeaders(request.headers);
  const hasBody = request.method !== "GET" && request.method !== "HEAD" && request.body;

  return new Request(url, {
    method: request.method,
    headers,
    body: hasBody ? JSON.stringify(request.body) : undefined,
  });
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.route({
    method: ["GET", "POST"],
    url: "/auth/*",
    async handler(request, reply) {
      const response = await auth.handler(toWebRequest(request));

      reply.status(response.status);
      response.headers.forEach((value, key) => {
        if (key !== "set-cookie") reply.header(key, value);
      });

      const cookies = response.headers.getSetCookie();
      if (cookies.length > 0) reply.header("set-cookie", cookies);

      const body = response.body ? await response.text() : null;
      return reply.send(body);
    },
  });
};
