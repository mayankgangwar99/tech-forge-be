import { z } from "zod";
import { AppError } from "../../utils/appError";
import { PlanData } from "./plan.types";

/* ============================= */
/* ===== WEEKLY ITEM ========== */
/* ============================= */

const weeklyPlanItemSchema = z
  .object({
    week: z.number().int().positive(),
    focus: z.string().min(1),
    topics: z.array(z.string().min(1)).nonempty(),
    practiceTasks: z.array(z.string().min(1)).nonempty(),
    behavioralTasks: z.array(z.string().min(1)).nonempty(),
    systemDesignTasks: z.array(z.string().min(1)).nonempty(),
    isDailyPlanGenerated: z.boolean().optional().default(false),
  })
  .strict();

/* ============================= */
/* ===== PLAN DATA ============ */
/* ============================= */

const planDataSchema = z
  .object({
    durationWeeks: z.number().int().min(2).max(8),
    weeklyPlan: z.array(weeklyPlanItemSchema).nonempty(),
    dailyHabitSuggestion: z.string().min(1),
    milestoneGoal: z.string().min(1),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Ensure week count matches duration
    if (data.weeklyPlan.length !== data.durationWeeks) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "weeklyPlan length must match durationWeeks",
        path: ["weeklyPlan"],
      });
    }

    // Ensure week numbers are sequential
    data.weeklyPlan.forEach((item, index) => {
      if (item.week !== index + 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid week number. Expected week ${index + 1}`,
          path: ["weeklyPlan", index, "week"],
        });
      }
    });
  });

/* ============================= */
/* ===== VALIDATOR ============ */
/* ============================= */

export const validatePlanData = (raw: unknown): PlanData => {
  const parsed = planDataSchema.safeParse(raw);

  if (!parsed.success) {
    throw new AppError(
      "Invalid plan format from AI service",
      502,
      parsed.error.flatten()
    );
  }

  return parsed.data;
};
