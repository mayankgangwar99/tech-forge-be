import { Types } from "mongoose";
import { buildPreparationPlanPrompt } from "../../ai/prompts/plan.prompt";
import { callConfiguredProvider } from "../../services/aiProvider.service";
import { AppError } from "../../utils/appError";
import { ResumeAnalysis } from "../resume/resume-analysis.model";
import { Resume } from "../resume/resume.model";
import { Plan } from "./plan.model";
import { GeneratePlanInput, MarkDayCompleteInput } from "./plan.types";
import { validatePlanData } from "./plan.validation";

/* ===================================== */
/* ===== GENERATE PREPARATION PLAN ===== */
/* ===================================== */

export const generatePreparationPlan = async (
  input: GeneratePlanInput
) => {
  const userId = new Types.ObjectId(input.userId);
  const resumeId = new Types.ObjectId(input.resumeId);

  const resume = await Resume.findOne({
    _id: resumeId,
    userId,
    softDeleted: false,
  });

  if (!resume) {
    throw new AppError("Resume not found", 404);
  }

  const analysis = await ResumeAnalysis.findOne({
    resumeId: resume._id,
  }).sort({ createdAt: -1 });

  if (
    !analysis ||
    typeof analysis.resumeScore !== "number" ||
    typeof analysis.roleFitScore !== "number" ||
    !Array.isArray(analysis.strengths) ||
    !Array.isArray(analysis.weaknesses) ||
    !Array.isArray(analysis.skillMatch?.missing)
  ) {
    throw new AppError("Resume analysis not found", 404);
  }

  // Prevent duplicate plans for same resume + duration
  const existing = await Plan.findOne({
    userId,
    resumeId,
    durationWeeks: input.durationWeeks,
  });

  if (existing) {
    return existing;
  }

  const prompt = buildPreparationPlanPrompt({
    resumeScore: analysis.resumeScore,
    roleFitScore: analysis.roleFitScore,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
    missingSkills: analysis.skillMatch.missing,
    targetRole: resume.targetRole ?? "Target Role",
    experienceLevel: resume.experienceLevel ?? "Intermediate",
    durationWeeks: input.durationWeeks,
  });

  const aiResult = await callConfiguredProvider(prompt);

  const planData = validatePlanData(aiResult.data);

  const savedPlan = await Plan.create({
    userId,
    resumeId,
    durationWeeks: input.durationWeeks,

    planData,
    planVersion: 1,
    planStatus: "generated",

    progress: {
      totalDays: input.durationWeeks * 7,
      completedDayNumbers: [],
    },

    providerUsed: aiResult.providerUsed,
    modelUsed: aiResult.modelUsed,
  });

  // Link plan to latest resume analysis (non-blocking)
  if (analysis?._id) {
    ResumeAnalysis.updateOne(
      { _id: analysis._id },
      { planId: savedPlan._id }
    ).catch(() => {});
  }

  return savedPlan;
};

/* =============================== */
/* ===== LIST USER PLANS ======== */
/* =============================== */

export const listPlans = async (input: {
  userId: string;
  page: number;
  limit: number;
}) => {
  if (!Types.ObjectId.isValid(input.userId)) {
    throw new AppError("Invalid user id", 400);
  }

  if (!Number.isInteger(input.page) || input.page < 1) {
    throw new AppError("page must be a positive integer", 400);
  }

  if (!Number.isInteger(input.limit) || input.limit < 1) {
    throw new AppError("limit must be a positive integer", 400);
  }

  const userId = new Types.ObjectId(input.userId);
  const skip = (input.page - 1) * input.limit;

  const [plans, total] = await Promise.all([
    Plan.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(input.limit),
    Plan.countDocuments({ userId }),
  ]);

  return {
    items: plans,
    page: input.page,
    limit: input.limit,
    total,
    hasNextPage: skip + plans.length < total,
  };
};

/* ================================= */
/* ===== GET LATEST USER PLAN ====== */
/* ================================= */

export const getOwnLatestPlan = async (input: { userId: string }) => {
  if (!Types.ObjectId.isValid(input.userId)) {
    throw new AppError("Invalid user id", 400);
  }

  const userId = new Types.ObjectId(input.userId);

  const plan = await Plan.findOne({ userId }).sort({ createdAt: -1 });

  if (!plan) {
    throw new AppError("Plan not found", 404);
  }

  return plan;
};

/* ================================= */
/* ===== MARK DAY COMPLETE ========= */
/* ================================= */

export const markPlanDayComplete = async (
  input: MarkDayCompleteInput
) => {
  if (!Types.ObjectId.isValid(input.planId)) {
    throw new AppError("Invalid plan id", 400);
  }

  const userId = new Types.ObjectId(input.userId);
  const planId = new Types.ObjectId(input.planId);

  const plan = await Plan.findOne({ _id: planId, userId });
  if (!plan) {
    throw new AppError("Plan not found", 404);
  }

  const totalDays = plan.progress.totalDays;

  if (input.dayNumber < 1 || input.dayNumber > totalDays) {
    throw new AppError(
      `dayNumber must be between 1 and ${totalDays}`,
      400
    );
  }

  const completedDaysSet = new Set<number>(
    plan.progress.completedDayNumbers
  );
  completedDaysSet.add(input.dayNumber);

  const completedDayNumbers = Array.from(completedDaysSet).sort(
    (a, b) => a - b
  );

  plan.progress = {
    totalDays,
    completedDayNumbers,
  };

  // Update plan status
  if (completedDayNumbers.length > 0) {
    plan.planStatus = "in_progress";
  }

  if (completedDayNumbers.length === totalDays) {
    plan.planStatus = "completed";
  }

  await plan.save();
  return plan;
};