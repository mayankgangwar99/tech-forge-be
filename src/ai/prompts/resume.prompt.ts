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
    '  "resumeScore": number,',
    '  "roleFitScore": number,',
    '  "strengths": string[],',
    '  "weaknesses": string[],',
    '  "missingSkills": string[],',
    '  "suggestions": string[]',
    "}",
    "",
    "Resume Text:",
    resumeText,
  ].join("\n");
};
