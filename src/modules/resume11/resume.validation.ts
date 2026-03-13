import { z } from "zod";
import { AppError } from "../../utils/appError";
import { ResumeProcessingResult } from "./resume.types";

const resumeAnalysisSchema = z.object({
  summary: z.string().min(1),
  resumeScore: z.number(),
  roleFitScore: z.number(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  skillMatch: z.object({
    matched: z.array(z.string()),
    missing: z.array(z.string()),
  }),
  experienceGapAnalysis: z.string().min(1),
  roleReadinessLevel: z.enum(["Low", "Medium", "High"]),
  suggestions: z.array(z.string()),
});

export const validateResumeAnalysisOutput = (payload: unknown): ResumeProcessingResult => {
  const parsed = resumeAnalysisSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError("Invalid analysis format from AI service", 502, parsed.error.flatten());
  }

  return parsed.data;
};
