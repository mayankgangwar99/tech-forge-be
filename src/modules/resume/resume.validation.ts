import { z } from "zod";

export const uploadResumeValidation = {
  body: z.object({
    role: z.string().trim().min(1, "Role is required").max(120),
    experience: z.string().trim().min(1, "Experience is required").max(120),
  }),
};

export const resumeAnalysisSchema = z.object({
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
