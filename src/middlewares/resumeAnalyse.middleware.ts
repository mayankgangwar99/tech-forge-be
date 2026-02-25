import multer, { FileFilterCallback } from "multer";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError";
import { fileTypeFromBuffer } from "file-type";

const MAX_RESUME_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_RESUME_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
  "application/msword", // DOC
]);

// -----------------------------
// Multer File Filter
// -----------------------------
const resumeFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
): void => {
  if (!ALLOWED_RESUME_MIME_TYPES.has(file.mimetype)) {
    callback(
      new AppError(
        "Unsupported resume file type. Allowed formats: PDF, DOC, DOCX.",
        400
      )
    );
    return;
  }

  callback(null, true);
};

export const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_RESUME_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: resumeFileFilter,
});

// -----------------------------
// Magic Number Validation
// -----------------------------
const validateMagicNumberForMime = async (
  file: Express.Multer.File
): Promise<boolean> => {
  const detected = await fileTypeFromBuffer(file.buffer);

  // PDF
  if (file.mimetype === "application/pdf") {
    return detected?.mime === "application/pdf";
  }

  // DOCX (ZIP container)
  if (
    file.mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return detected?.mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  // DOC (Old Word - Compound File Binary Format)
  if (file.mimetype === "application/msword") {
    return detected?.mime === "application/x-cfb";
  }

  return false;
};

export const validateResumeMagicNumber = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.file) {
    throw new AppError("Resume file is required", 400);
  }

  const valid = await validateMagicNumberForMime(req.file);

  if (!valid) {
    throw new AppError("File content does not match declared type", 400);
  }

  next();
};