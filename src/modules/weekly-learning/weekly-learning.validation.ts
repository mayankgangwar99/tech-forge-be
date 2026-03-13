import { z } from "zod";
import { AppError } from "../../utils/appError";
import { WeeklyPathContent } from "./weekly-learning.types";

/* ============================= */
/* ===== DAILY ITEM SCHEMA ===== */
/* ============================= */

const dailyLearningItemSchema = z
  .object({
    day: z.number().int().min(1).max(7),
    dayTitle: z.string().min(1),

    topicsCovered: z.array(z.string().min(1)).nonempty(),
    learningObjective: z.string().min(1),

    practiceTasks: z.array(z.string().min(1)),
    behavioralTasks: z.array(z.string().min(1)),
    systemDesignTasks: z.array(z.string().min(1)),

    interviewFocus: z.string().min(1),
  })
  .strict();

/* ============================= */
/* ===== WEEKLY PATH CONTENT == */
/* ============================= */

const weeklyPathContentSchema = z
  .object({
    week: z.number().int().positive(),
    focus: z.string().min(1),

    targetRole: z.string().min(1),
    experienceLevel: z.string().min(1),

    dailyLearningPath: z.array(dailyLearningItemSchema).length(7),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Enforce strict sequential days (1 → 7)
    data.dailyLearningPath.forEach((item, index) => {
      const expectedDay = index + 1;
      if (item.day !== expectedDay) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid day order. Expected day ${expectedDay}`,
          path: ["dailyLearningPath", index, "day"],
        });
      }
    });
  });

/* ============================= */
/* ===== VALIDATOR FUNCTION ==== */
/* ============================= */

export const validateWeeklyPathContent = (
  raw: unknown
): WeeklyPathContent => {
  const unwrapped =
    raw && typeof raw === "object" && "content" in raw
      ? (raw as { content: unknown }).content
      : raw;

  const parsed = weeklyPathContentSchema.safeParse(unwrapped);

  if (!parsed.success) {
    throw new AppError(
      "Invalid weekly path content from AI service",
      502,
      parsed.error.flatten()
    );
  }

  return parsed.data;
};

/* ============================= */
/* ===== GENERATE WEEKLY PATH == */
/* ============================= */

export const generateWeeklyPathValidation = {
  body: z.object({
    planId: z.string().min(1),
    week: z.number().int().positive(),
  }),
};

/* ============================= */
/* ===== GET WEEKLY PATH ======= */
/* ============================= */

export const getWeeklyPathValidation = {
  params: z.object({
    planId: z.string().min(1),
    week: z.coerce.number().int().positive(),
  }),
};


export const markCompleteValidation = {
  params: z.object({
    planId: z.string().min(1),
    week: z.coerce.number().int().positive(),
    day: z.coerce.number().int().min(1).max(7),
  }),
};