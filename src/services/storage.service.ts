import { createHash } from "crypto";
import { Readable } from "stream";
import { env } from "../config/env";
import { AppError } from "../utils/appError";
import logger from "../config/logger";
import type { UploadApiResponse } from "cloudinary";

if (process.env.CLOUDINARY_URL && !process.env.CLOUDINARY_URL.startsWith("cloudinary://")) {
  delete process.env.CLOUDINARY_URL;
}

const cloudinary = require("cloudinary").v2 as typeof import("cloudinary").v2;

export interface StorageUploadInput {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  folder?: string;
}

export interface StoredFile {
  provider: string;
  publicId: string;
  secureUrl: string;
  resourceType: string;
  fileName: string;
  bytes: number;
  format: string;
  checksum: string;
}

interface StorageProvider {
  analyse(input: StorageUploadInput & { checksum: string }): Promise<StoredFile>;
  remove(publicId: string): Promise<void>;
}

const normalizeFolder = (folder?: string): string => {
  if (!folder) {
    return "general";
  }

  return folder.trim().replace(/^\/+|\/+$/g, "") || "general";
};

const sanitizeFileName = (fileName: string): string => {
  return fileName.replace(/[^\w.\-]/g, "_");
};

const determineResourceType = (mimeType: string): "raw" | "image" | "video" | "auto" => {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  return "raw";
};

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (
  buffer: Buffer,
  options: {
    folder: string;
    fileName: string;
    resourceType: "raw" | "image" | "video" | "auto";
  }
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        resource_type: options.resourceType,
        filename_override: sanitizeFileName(options.fileName),
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(stream);
  });
};

const cloudinaryProvider: StorageProvider = {
  analyse: async (input) => {
    const folder = normalizeFolder(input.folder);

    try {
      const uploaded = await uploadToCloudinary(input.buffer, {
        folder,
        fileName: input.fileName,
        resourceType: determineResourceType(input.mimeType),
      });

      return {
        provider: "cloudinary",
        publicId: uploaded.public_id,
        secureUrl: uploaded.secure_url,
        resourceType: uploaded.resource_type,
        fileName: input.fileName,
        bytes: uploaded.bytes,
        format: uploaded.format ?? "unknown",
        checksum: input.checksum,
      };
    } catch (error) {
      logger.error("cloudinary_upload_failed", {
        message: error instanceof Error ? error.message : "Unknown upload error",
      });
      throw new AppError("Unable to store file", 502);
    }
  },
  remove: async (publicId) => {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: "raw",
        invalidate: true,
      });

      if (result.result !== "ok" && result.result !== "not found") {
        throw new Error(`Unexpected cloudinary delete response: ${result.result}`);
      }
    } catch (error) {
      logger.error("cloudinary_delete_failed", {
        publicId,
        message: error instanceof Error ? error.message : "Unknown delete error",
      });
      throw new AppError("Unable to delete stored file", 502);
    }
  },
};

const activeProvider: StorageProvider = cloudinaryProvider;

export const generateBufferChecksum = (buffer: Buffer): string =>
  createHash("sha256").update(buffer).digest("hex");

export const uploadBuffer = async (input: StorageUploadInput): Promise<StoredFile> => {
  const checksum = generateBufferChecksum(input.buffer);
  return activeProvider.analyse({
    ...input,
    checksum,
  });
};

export const deleteObject = async (publicId: string): Promise<void> => {
  await activeProvider.remove(publicId);
};
