import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import logger from "../config/logger";
import { AppError } from "../utils/appError";
import { sendError } from "../utils/apiResponse";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  logger.error("request_error", {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    message: err.message,
  });

  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.message);
  }

  if (err instanceof ZodError) {
    return sendError(
      res,
      400,
      "Validation failed",
      err.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }))
    );
  }

  if (err?.name === "ValidationError") {
    return sendError(res, 400, "Validation failed");
  }

  if (err?.name === "MulterError") {
    if (err?.code === "LIMIT_FILE_SIZE") {
      return sendError(res, 400, "Resume file too large. Max allowed size is 5MB.");
    }

    return sendError(res, 400, "Invalid file upload");
  }

  if (err?.code === 11000) {
    return sendError(res, 409, "Duplicate resource");
  }

  return sendError(res, 500, "Internal Server Error");
};
