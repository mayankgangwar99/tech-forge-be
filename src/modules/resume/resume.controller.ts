import { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { AppError } from "../../utils/appError";
import { asyncHandler } from "../../utils/asyncHandler";
import resumeService from "./resume.service";

export const uploadResume = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  if (!req.file) {
    throw new AppError("Resume file is required", 400);
  }

  const role = req.body.role as string;
  const experience = req.body.experience as string;

  const result = await resumeService.resumeProcessingService(
    req.file.buffer,
    req.user.id,
    role,
    experience,
  );

  if (!result) throw new AppError("Failed to process resume", 500);

  return sendSuccess(res, 200, "Resume processed successfully", result);
});

export const currentAnalysis = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const analysis = await resumeService.getCurrentAnalysis(req.user.id);

  if (!analysis) {
    throw new AppError("No analysis found for the current resume", 404);
  }

  return sendSuccess(res, 200, "Current resume analysis retrieved successfully", analysis);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const { page, limit, sort } = req.query as unknown as {
    page: number;
    limit: number;
    sort: "newest" | "oldest";
  };

  const resumes = await resumeService.listResumes(req.user.id, page, limit, sort);
  
  return sendSuccess(res, 200, "Resumes retrieved successfully", resumes);
});

export const deleteResume = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }
  
  const resumeId = req.params.id as string;
  await resumeService.deleteResume(req.user.id, resumeId);

  return sendSuccess(res, 200, "Resume deleted successfully", null);
});
