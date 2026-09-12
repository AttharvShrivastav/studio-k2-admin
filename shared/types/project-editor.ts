import type { ProjectEditorInput } from "../schemas/project-editor.js";
import type { ProjectBasics } from "./project.js";

export type ProjectEditorData = Omit<ProjectEditorInput, "confirmTemplateReset"> & {
  project: ProjectBasics;
  templateHasContent: boolean;
};
export type ProjectEditorResponse = { editor: ProjectEditorData };
export type UploadedMedia = { url: string; storageKey: string; originalFilename: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; size: number; width?: number; height?: number };
export type ImageUploadResponse = { files: UploadedMedia[] };
export type SequenceUploadResponse = { sequence: { framePath: string; frames: string[]; frameCount: number; firstFrameNumber: number; padding: number; extension: "jpg" | "png" | "webp" } };
