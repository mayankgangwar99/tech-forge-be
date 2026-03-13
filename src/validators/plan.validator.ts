import { z } from "zod";
import { Types } from "mongoose";
import { env } from "../config/env";

export const generatePlanValidation = {
  body: z.object({
    resumeId: z
      .string()
      .trim()
      .refine((value) => Types.ObjectId.isValid(value), "Invalid resume id"),
    durationWeeks: z.coerce.number().int().min(2).max(8),
  }),
};

export const listPlansValidation = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(env.RESUME_PAGINATION_MAX_LIMIT)
      .default(10),
  }),
};

export const completePlanDayValidation = {
  params: z.object({
    id: z
      .string()
      .trim()
      .refine((value) => Types.ObjectId.isValid(value), "Invalid plan id"),
  }),
  body: z.object({
    dayNumber: z.coerce.number().int().positive(),
  }),
};
