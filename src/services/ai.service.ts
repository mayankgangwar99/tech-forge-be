import { z } from "zod";
import { requestStructuredOutput, StructuredOutputResult } from "./openai.provider";

const resumeInsightsSchema = z.object({
  summary: z.string().min(1).max(2000),
  experience_years: z.number().min(0).max(80),
  skills: z.array(z.string().min(1).max(120)).max(150),
  education: z.array(z.string().min(1).max(300)).max(50),
  projects: z.array(z.string().min(1).max(300)).max(100),
  strengths: z.array(z.string().min(1).max(300)).max(50),
  gaps: z.array(z.string().min(1).max(300)).max(50),
  job_fit_score: z.number().min(0).max(100),
  improvement_suggestions: z.array(z.string().min(1).max(500)).max(50),
});

export type ResumeInsights = z.infer<typeof resumeInsightsSchema>;

const outputSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "experience_years",
    "skills",
    "education",
    "projects",
    "strengths",
    "gaps",
    "job_fit_score",
    "improvement_suggestions",
  ],
  properties: {
    summary: { type: "string" },
    experience_years: { type: "number" },
    skills: { type: "array", items: { type: "string" } },
    education: { type: "array", items: { type: "string" } },
    projects: { type: "array", items: { type: "string" } },
    strengths: { type: "array", items: { type: "string" } },
    gaps: { type: "array", items: { type: "string" } },
    job_fit_score: { type: "number" },
    improvement_suggestions: { type: "array", items: { type: "string" } },
  },
} as const;

export interface ResumeAnalysisResult {
  insights: ResumeInsights;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  totalTokens: number;
  latencyMs: number;
}

const buildResumePrompt = (text: string): string => {
  return [
    "Analyze the following resume text and return a strict JSON object that matches the schema.",
    "Rules:",
    "- Do not include markdown.",
    "- Keep arrays concise and relevant.",
    "- job_fit_score must be a number from 0 to 100.",
    "",
    "Resume Text:",
    text,
  ].join("\n");
};

export const analyzeResume = async (text: string): Promise<ResumeAnalysisResult> => {
  const response: StructuredOutputResult<unknown> = await requestStructuredOutput(buildResumePrompt(text), {
    feature: "resume-analysis",
    schemaName: "resume_analysis_v1",
    schema: outputSchema as unknown as Record<string, unknown>,
  });

  const insights = resumeInsightsSchema.parse(response.data);

  return {
    insights,
    model: response.model,
    tokensInput: response.tokensInput,
    tokensOutput: response.tokensOutput,
    totalTokens: response.totalTokens,
    latencyMs: response.latencyMs,
  };
};
