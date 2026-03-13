export const buildPreparationPlanPrompt = (input: {
  resumeScore: number;
  roleFitScore: number;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  targetRole: string;
  experienceLevel: string;
  durationWeeks: number;
}): string => {
  return [
    "Generate a structured, interview-focused preparation plan.",
    "Return STRICT JSON only.",
    "No markdown.",
    "No explanations.",
    "No extra text.",
    "Response must start with { and end with }.",
    "",
    "PERSONALIZATION RULES:",
    "- Personalization means prioritizing missingSkills and weaknesses.",
    "- Strengths may be included only for revision, not as primary focus.",
    "- Do NOT invent skills, tools, or topics outside the provided inputs.",
    "",
    "EXPERIENCE LEVEL RULES:",
    "- Adjust depth based on experienceLevel.",
    "- If experience is senior, avoid beginner-level topics or explanations.",
    "",
    "STRUCTURE RULES:",
    "- Distribute content evenly across durationWeeks.",
    "- Do NOT repeat the same topic in multiple weeks.",
    "- Each week must have a clear focus area.",
    "- Weekly plans must be suitable for later conversion into daily plans.",
    "",
    "Required JSON format:",
    "{",
    '  "durationWeeks": number,',
    '  "weeklyPlan": [',
    "    {",
    '      "week": number,',
    '      "focus": string,',
    '      "topics": string[],',
    '      "practiceTasks": string[],',
    '      "behavioralTasks": string[],',
    '      "systemDesignTasks": string[]',
    "    }",
    "  ],",
    '  "dailyHabitSuggestion": string,',
    '  "milestoneGoal": string',
    "}",
    "",
    `durationWeeks: ${input.durationWeeks}`,
    `resumeScore: ${input.resumeScore}`,
    `roleFitScore: ${input.roleFitScore}`,
    `targetRole: ${input.targetRole}`,
    `experienceLevel: ${input.experienceLevel}`,
    `strengths: ${JSON.stringify(input.strengths)}`,
    `weaknesses: ${JSON.stringify(input.weaknesses)}`,
    `missingSkills: ${JSON.stringify(input.missingSkills)}`
  ].join("\n");
};