import { Types } from "mongoose";
import { z } from "zod";
import { env } from "../config/env";

export const uploadResumeValidation = {
  body: z.object({
    role: z.string().trim().min(1, "Role is required").max(120),
    experience: z.string().trim().min(1, "Experience is required").max(120),
  }),
};

export const deleteResumeValidation = {
  params: z.object({
    id: z
      .string()
      .trim()
      .refine((value) => Types.ObjectId.isValid(value), "Invalid resume id"),
  }),
};

export const listResumesValidation = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(env.RESUME_PAGINATION_MAX_LIMIT)
      .default(10),
    sort: z.enum(["newest", "oldest"]).default("newest"),
  }),
};
