import type { FastifyPluginAsync } from "fastify";
import { requireAuthentication } from "../auth/guard.js";
import { contentTypeFor, resolveStoredFile, saveImage, saveSequence, UploadError } from "../storage/filesystem.js";

function uploadFailure(error: unknown) {
  if (error instanceof UploadError) return { status: error.status, body: { error: { code: error.code, message: error.message } } };
  if (error && typeof error === "object" && "code" in error && error.code === "FST_REQ_FILE_TOO_LARGE") return { status: 413, body: { error: { code: "FILE_TOO_LARGE", message: "Each image must be 10 MB or smaller" } } };
  return null;
}

export const uploadRoutes: FastifyPluginAsync = async (app) => {
  app.post("/admin/uploads/images", { preHandler: requireAuthentication }, async (request, reply) => {
    try {
      const files = [];
      for await (const part of request.files({ limits: { files: 20, fileSize: 10 * 1024 * 1024 } })) files.push(await saveImage(await part.toBuffer(), part.filename));
      if (!files.length) throw new UploadError("NO_FILES", "Choose at least one image");
      return { files };
    } catch (error) {
      const failure = uploadFailure(error);
      if (failure) return reply.status(failure.status).send(failure.body);
      throw error;
    }
  });

  app.post("/admin/uploads/sequence", { preHandler: requireAuthentication }, async (request, reply) => {
    try {
      const files = [];
      let totalSize = 0;
      for await (const part of request.files({ limits: { files: 500, fileSize: 5 * 1024 * 1024 } })) { const buffer = await part.toBuffer(); totalSize += buffer.length; if (totalSize > 256 * 1024 * 1024) throw new UploadError("SEQUENCE_TOO_LARGE", "Sequence upload exceeds the 256 MB request limit", 413); files.push({ buffer, filename: part.filename }); }
      return { sequence: await saveSequence(files) };
    } catch (error) {
      const failure = uploadFailure(error);
      if (failure) return reply.status(failure.status).send(failure.body);
      throw error;
    }
  });

  app.get<{ Params: { "*": string } }>("/uploads/*", async (request, reply) => {
    try {
      const key = request.params["*"];
      const file = await resolveStoredFile(key);
      reply.type(contentTypeFor(key)).header("Cache-Control", "public, max-age=31536000, immutable");
      return reply.send(file);
    } catch (error) {
      const failure = uploadFailure(error);
      if (failure) return reply.status(failure.status).send(failure.body);
      throw error;
    }
  });
};
