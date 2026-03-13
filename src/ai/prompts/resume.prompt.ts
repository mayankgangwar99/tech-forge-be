export const buildResumeAnalysisPrompt = (
  resumeText: string,
  role: string,
  experience: string
): string => {
  return [
    "You are a resume analysis engine.",
    `Target Role: ${role}`,
    `Expected Experience: ${experience}`,
    "Analyze the resume text and return STRICT JSON only.",
    "No markdown. No explanation. No additional keys.",
    "Required JSON format:",
    "{",
    '  "summary": string,',
    '  "resumeScore": number,',
    '  "roleFitScore": number,',
    '  "strengths": string[],',
    '  "weaknesses": string[],',
    '  "skillMatch": { "matched": string[], "missing": string[] },',
    '  "experienceGapAnalysis": string,',
    '  "roleReadinessLevel": "Low" | "Medium" | "High",',
    '  "suggestions": string[]',
    "}",
    "",
    "Resume Text:",
    resumeText,
  ].join("\n");
};
