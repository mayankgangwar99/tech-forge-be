import { Types } from "mongoose";
import { AppError } from "../../utils/appError";
import { Plan } from "../plan/plan.model";
import { WeeklyPath } from "./weekly-learning.model";
import { buildWeeklyPathPrompt } from "../../ai/prompts/weeklyPath.prompt";
import { callConfiguredProvider } from "../../services/aiProvider.service";
import { validateWeeklyPathContent } from "./weekly-learning.validation";
import { getObjectId } from "../../utils/getObjectId";
import { WeeklyPathContent, WeeklyPathResponse } from "./weekly-learning.types";
import { Resume } from "../resume11/resume.model";
import { mapWeeklyPathResponse } from "./weekly-learning.mapper";

/* ============================= */
/* ===== GENERATE WEEKLY PATH == */
/* ============================= */

export const generateWeeklyPath = async (input: {
  userId: string;
  planId: string;
  week: number;
}): Promise<WeeklyPathResponse> => {
  if (!Types.ObjectId.isValid(input.userId)) {
    throw new AppError("Invalid userId", 400);
  }

  if (!Types.ObjectId.isValid(input.planId)) {
    throw new AppError("Invalid planId", 400);
  }

  const userId = getObjectId(input.userId);
  const planId = getObjectId(input.planId);

  /* ============================= */
  /* ===== FETCH PLAN ============ */
  /* ============================= */

  const plan = await Plan.findOne({ _id: planId, userId });
  const resume = await Resume.findOne({ _id: plan?.resumeId, userId });

  if (!resume) {
    throw new AppError("Associated resume not found", 404);
  }

  if (!plan) {
    throw new AppError("Plan not found", 404);
  }

  const weeklyPlanItem = plan.planData.weeklyPlan.find(
    (w: WeeklyPathContent) => w.week === input.week,
  );

  if (!weeklyPlanItem) {
    throw new AppError(`Week ${input.week} not found in plan`, 404);
  }

  /* ============================= */
  /* ===== IDEMPOTENCY CHECK ===== */
  /* ============================= */

  const existing = await WeeklyPath.findOne({
    planId,
    week: input.week,
  });

  const existingWeeklyPath = await WeeklyPath.findOne({
    planId: input.planId,
    week: input.week,
    userId: input.userId,
  });

  if (existingWeeklyPath) {
    return mapWeeklyPathResponse(existingWeeklyPath);
  }

  /* ============================= */
  /* ===== BUILD PROMPT ========== */
  /* ============================= */

  const prompt = buildWeeklyPathPrompt({
    weeklyPlan: weeklyPlanItem,
    targetRole: resume?.targetRole || "Software Engineer",
    experienceLevel: resume?.experienceLevel || "Intermediate",
  });

  /* ============================= */
  /* ===== CALL AI PROVIDER ====== */
  /* ============================= */

  const aiResult = await callConfiguredProvider(prompt);

  /* ============================= */
  /* ===== VALIDATE AI OUTPUT ==== */
  /* ============================= */

  const validatedContent = validateWeeklyPathContent(aiResult.data);

  /* ============================= */
  /* ===== PERSIST WEEKLY PATH === */
  /* ============================= */

  const weeklyPath = await WeeklyPath.create({
    planId,
    userId,

    content: validatedContent,

    providerUsed: aiResult.providerUsed,
    modelUsed: aiResult.modelUsed,
  });

  await Plan.updateOne(
    { _id: planId },
    {
      $set: {
        "planData.weeklyPlan.$[elem]": {
          ...weeklyPlanItem,
          isDailyPlanGenerated: true,
        },
      },
    },
  );

  return mapWeeklyPathResponse(weeklyPath);
};

/* ============================= */
/* ===== GET WEEKLY PATH ======= */
/* ============================= */

export const getWeeklyPath = async (input: {
  userId: string;
  planId: string;
  week: number;
}): Promise<WeeklyPathResponse> => {
  if (!Types.ObjectId.isValid(input.userId)) {
    throw new AppError("Invalid userId", 400);
  }

  if (!Types.ObjectId.isValid(input.planId)) {
    throw new AppError("Invalid planId", 400);
  }

  console.log("Fetching weekly path with input:", input);

  const weeklyPath = await WeeklyPath.findOne({
    planId: input.planId,
    'content.week': input.week,
    userId: input.userId,
  });

  if (!weeklyPath) {
    throw new AppError("Weekly path not found", 404);
  }

  return mapWeeklyPathResponse(weeklyPath);
};

/* ============================= */
/* ===== MARK DAY COMPLETE ===== */
/* ============================= */
export const markDayComplete = async (input: {
  userId: string;
  planId: string;
  week: number;
  day: number;
}): Promise<WeeklyPathResponse> => {
  if (!Types.ObjectId.isValid(input.userId)) {
    throw new AppError("Invalid userId", 400);
  }

  if (!Types.ObjectId.isValid(input.planId)) {
    throw new AppError("Invalid planId", 400);
  }

  const weeklyPath = await WeeklyPath.findOne({
    planId: input.planId,
    'content.week': input.week,
    userId: input.userId,
  });

  if (!weeklyPath) {
    throw new AppError("Weekly path not found", 404);
  }

  // Update the specific day's completion status
  weeklyPath.content.dailyLearningPath[input.day - 1].isComplete = true;

  // Save the updated weekly path
  await weeklyPath.save();

  return mapWeeklyPathResponse(weeklyPath);
};

