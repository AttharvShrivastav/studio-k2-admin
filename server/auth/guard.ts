import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";
import { auth } from "./index.js";

export async function requireAuthentication(request: FastifyRequest, reply: FastifyReply) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

  if (!session) {
    return reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication is required",
      },
    });
  }
}
