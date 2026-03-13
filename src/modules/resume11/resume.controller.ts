import { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { AppError } from "../../utils/appError";
import { asyncHandler } from "../../utils/asyncHandler";
import { getCurrentUserResumeAnalysis } from "./resume.current-analysis.service";
import { deleteResume } from "./resume.delete.service";
import { listResumes } from "./resume.list.service";
import { processResume } from "./resume.service";

export const upload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  if (!req.file) {
    throw new AppError("Resume file is required", 400);
  }

  const role = req.body.role as string;
  const experience = req.body.experience as string;

  const result = await processResume(req.file.buffer, req.user.id, role, experience);
  return sendSuccess(res, 200, "Resume processed successfully", result);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const page = Number(req.query.page);
  const limit = Number(req.query.limit);
  const sort = req.query.sort as "newest" | "oldest";

  const paginated = await listResumes({
    userId: req.user.id,
    page,
    limit,
    sort,
  });

  return sendSuccess(res, 200, "Resumes fetched successfully", paginated.items, {
    page: paginated.page,
    limit: paginated.limit,
    total: paginated.total,
    hasNextPage: paginated.hasNextPage,
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const resumeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await deleteResume(req.user.id, resumeId);
  return sendSuccess(res, 200, "Resume deleted successfully", { id: resumeId, deleted: true });
});

export const currentAnalysis = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const analysis = await getCurrentUserResumeAnalysis(req.user.id);
  return sendSuccess(res, 200, "Current resume analysis fetched successfully", analysis);
});
