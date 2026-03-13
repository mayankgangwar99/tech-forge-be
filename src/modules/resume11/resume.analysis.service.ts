import { processResumeAnalysis } from "./resume.analysis.worker";
import { ResumeAiMeta } from "./resume.types";

export const enqueueResumeAnalysis = (resumeId: string): void => {
  setImmediate(() => {
    void processResumeAnalysis(resumeId);
  });
};

export const enqueueAnalysisIfNeeded = (resumeId: string, ai: ResumeAiMeta): void => {
  if (ai.status !== "processed" && ai.status !== "processing") {
    enqueueResumeAnalysis(resumeId);
  }
};
