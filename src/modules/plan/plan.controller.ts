import { Request, Response } from "express";
import { AppError } from "../../utils/appError";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  generatePreparationPlan,
  getOwnLatestPlan,
  listPlans,
  markPlanDayComplete,
} from "./plan.service";

/* =============================== */
/* ===== GENERATE PLAN ========= */
/* =============================== */

export const generate = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const { resumeId, durationWeeks } = req.body;

  if (!resumeId || !Number.isInteger(durationWeeks)) {
    throw new AppError("Invalid request payload", 400);
  }

  const plan = await generatePreparationPlan({
    userId: req.user.id,
    resumeId,
    durationWeeks,
  });

  return sendSuccess(
    res,
    200,
    "Preparation plan generated successfully",
    plan
  );
});

/* =============================== */
/* ===== LIST PLANS ============ */
/* =============================== */

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  if (!Number.isInteger(page) || !Number.isInteger(limit)) {
    throw new AppError("Invalid pagination parameters", 400);
  }

  const result = await listPlans({
    userId: req.user.id,
    page,
    limit,
  });

  return sendSuccess(res, 200, "Plans fetched successfully", result.items, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    hasNextPage: result.hasNextPage,
  });
});

/* =============================== */
/* ===== CURRENT USER PLAN ===== */
/* =============================== */

export const currentUserPlan = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const plan = await getOwnLatestPlan({
      userId: req.user.id,
    });

    return sendSuccess(res, 200, "Plan fetched successfully", plan);
  }
);

/* =============================== */
/* ===== MARK DAY COMPLETE ===== */
/* =============================== */

export const complete = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const planId = req.params.id as string;
  const { dayNumber } = req.body;

  if (!Number.isInteger(dayNumber)) {
    throw new AppError("dayNumber must be an integer", 400);
  }

  const updated = await markPlanDayComplete({
    planId,
    dayNumber,
    userId: req.user.id,
  });

  return sendSuccess(
    res,
    200,
    "Plan progress updated successfully",
    updated
  );
});