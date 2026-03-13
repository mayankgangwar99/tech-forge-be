import { Request, Response } from "express";
import { AppError } from "../../utils/appError";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { generateWeeklyPath, getWeeklyPath, markDayComplete } from "./weekly-learning.service";

/* ============================= */
/* ===== GENERATE WEEKLY PATH == */
/* ============================= */

export const generateWeeklyPathController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const weeklyPath = await generateWeeklyPath({
    userId: req.user.id,
    planId: req.body.planId as string,
    week: req.body.week as number,
  });

  return sendSuccess(
    res,
    200,
    "Weekly learning path generated successfully",
    weeklyPath,
  );
});

/* ============================= */
/* ===== GET WEEKLY PATH ======= */
/* ============================= */

export const getWeeklyPathController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const weeklyPath = await getWeeklyPath({
    userId: req.user.id,
    planId: req.params.planId as string,
    week: Number(req.params.week),
  });

  return sendSuccess(
    res,
    200,
    "Weekly learning path fetched successfully",
    weeklyPath,
  );
});

/* ============================= */
/* ===== MARK DAY COMPLETE ===== */
/* ============================= */
export const markDayCompleteController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const { planId, week, day } = req.params as { planId: string; week: string; day: string };

  const updatedPath = await markDayComplete({
    userId: req.user.id,
    planId,
    week: Number(week),
    day: Number(day),
  });
  return sendSuccess(
    res,
    200,
    "Day marked as complete successfully",
    updatedPath
  );
});