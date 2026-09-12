import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../lib/env.js";
import type { UploadedMedia } from "../../shared/types/project-editor.js";

const formats = {
  "image/jpeg": { extension: "jpg" },
  "image/png": { extension: "png" },
  "image/webp": { extension: "webp" },
} as const;
type ImageMime = keyof typeof formats;

export class UploadError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) { super(message); }
}

export const uploadRoot = path.resolve(env.UPLOAD_ROOT);
if (uploadRoot === path.resolve(process.cwd(), "dist") || uploadRoot.startsWith(`${path.resolve(process.cwd(), "dist")}${path.sep}`)) {
  throw new Error("UPLOAD_ROOT must live outside generated build output");
}

function sniff(buffer: Buffer): ImageMime | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

function dimensions(buffer: Buffer, mime: ImageMime): { width?: number; height?: number } {
  if (mime === "image/png" && buffer.length >= 24) return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  if (mime === "image/jpeg") {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  return {};
}

export function validateImage(buffer: Buffer): ImageMime {
  const mime = sniff(buffer);
  if (!mime) throw new UploadError("INVALID_IMAGE", "Only valid JPEG, PNG, and WebP images are accepted");
  return mime;
}

export async function saveImage(buffer: Buffer, originalFilename: string, folder = "images"): Promise<UploadedMedia> {
  const mimeType = validateImage(buffer);
  const storageKey = `${folder}/${randomUUID()}.${formats[mimeType].extension}`;
  const target = path.resolve(uploadRoot, storageKey);
  if (!target.startsWith(`${uploadRoot}${path.sep}`)) throw new UploadError("INVALID_PATH", "Invalid upload path");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer, { flag: "wx" });
  return { url: `/api/uploads/${storageKey}`, storageKey, originalFilename: path.basename(originalFilename), mimeType, size: buffer.length, ...dimensions(buffer, mimeType) };
}

type SequenceInput = { buffer: Buffer; filename: string };
export async function saveSequence(files: SequenceInput[]) {
  if (files.length < 2) throw new UploadError("INVALID_SEQUENCE", "Upload at least two numbered frames");
  const parsed = files.map((file) => {
    const safeName = path.basename(file.filename);
    const match = /^(.*?)(\d+)\.([a-z0-9]+)$/i.exec(safeName);
    if (!match) throw new UploadError("INVALID_SEQUENCE", `Frame “${safeName}” needs a numeric suffix`);
    return { ...file, safeName, prefix: match[1], digits: match[2], number: Number(match[2]), claimedExtension: match[3].toLowerCase(), mime: validateImage(file.buffer) };
  }).sort((a, b) => a.number - b.number);
  const first = parsed[0];
  const extension = formats[first.mime].extension;
  for (let index = 0; index < parsed.length; index += 1) {
    const frame = parsed[index];
    if (frame.prefix !== first.prefix || frame.digits.length !== first.digits.length || frame.mime !== first.mime || frame.claimedExtension.replace("jpeg", "jpg") !== extension) {
      throw new UploadError("INVALID_SEQUENCE", "Sequence filenames must use one prefix, padding, and image extension");
    }
    if (index > 0 && frame.number !== parsed[index - 1].number + 1) throw new UploadError("INVALID_SEQUENCE", "Sequence frame numbering contains a gap");
  }
  const sequenceKey = `sequences/${randomUUID()}`;
  const directory = path.resolve(uploadRoot, sequenceKey);
  await mkdir(directory, { recursive: true });
  const urls: string[] = [];
  for (const frame of parsed) {
    const name = `frame-${String(frame.number).padStart(first.digits.length, "0")}.${extension}`;
    await writeFile(path.join(directory, name), frame.buffer, { flag: "wx" });
    urls.push(`/api/uploads/${sequenceKey}/${name}`);
  }
  return { framePath: `/api/uploads/${sequenceKey}/frame-{frame}.${extension}`, frames: urls, frameCount: urls.length, firstFrameNumber: first.number, padding: first.digits.length, extension };
}

export async function resolveStoredFile(key: string) {
  if (!/^(?:images\/[a-z0-9-]+\.(?:jpg|png|webp)|sequences\/[a-z0-9-]+\/frame-\d+\.(?:jpg|png|webp))$/i.test(key)) throw new UploadError("NOT_FOUND", "Upload not found", 404);
  const target = path.resolve(uploadRoot, key);
  if (!target.startsWith(`${uploadRoot}${path.sep}`)) throw new UploadError("NOT_FOUND", "Upload not found", 404);
  try { return await readFile(target); } catch { throw new UploadError("NOT_FOUND", "Upload not found", 404); }
}

export function contentTypeFor(key: string) {
  if (/\.png$/i.test(key)) return "image/png";
  if (/\.webp$/i.test(key)) return "image/webp";
  return "image/jpeg";
}
