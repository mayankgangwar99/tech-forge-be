export const buildWeeklyPathPrompt = (input: {
  weeklyPlan: {
    week: number;
    focus: string;
    topics: string[];
    practiceTasks: string[];
    behavioralTasks: string[];
    systemDesignTasks: string[];
  };
  targetRole: string;
  experienceLevel: string;
}): string => {
  return [
    "Convert the given weekly learning plan into a STRICT 7-day daily learning path.",
    "",
    "OUTPUT RULES (NON-NEGOTIABLE):",
    "- Return STRICT JSON only.",
    "- No markdown.",
    "- No explanations.",
    "- No extra keys.",
    "- Response must start with { and end with }.",
    "",
    "STRICT CONTENT RULES:",
    "- Do NOT add new topics, tools, tasks, or concepts.",
    "- Do NOT rename, merge, or modify provided items.",
    "- Do NOT remove or skip any provided item.",
    "- Every provided topic and task MUST appear at least once across the 7 days.",
    "- Duplication is allowed, omission is NOT.",
    "- Use ONLY the provided weekly plan content.",
    "",
    "DISTRIBUTION RULES:",
    "- Generate EXACTLY 7 days.",
    "- Days MUST be sequential from day 1 to day 7.",
    "- Distribute content logically and progressively.",
    "- Adjust explanation depth based ONLY on experienceLevel.",
    "",
    "REQUIRED JSON FORMAT (MUST MATCH EXACTLY):",
    "{",
    '  "week": number,',
    '  "focus": string,',
    '  "targetRole": string,',
    '  "experienceLevel": string,',
    '  "dailyLearningPath": [',
    "    {",
    '      "day": number,',
    '      "dayTitle": string,',
    '      "topicsCovered": string[],',
    '      "learningObjective": string,',
    '      "practiceTasks": string[],',
    '      "behavioralTasks": string[],',
    '      "systemDesignTasks": string[],',
    '      "interviewFocus": string',
    "    }",
    "  ]",
    "}",
    "",
    "INPUT DATA:",
    `week: ${input.weeklyPlan.week}`,
    `focus: ${input.weeklyPlan.focus}`,
    `targetRole: ${input.targetRole}`,
    `experienceLevel: ${input.experienceLevel}`,
    `topics: ${JSON.stringify(input.weeklyPlan.topics)}`,
    `practiceTasks: ${JSON.stringify(input.weeklyPlan.practiceTasks)}`,
    `behavioralTasks: ${JSON.stringify(input.weeklyPlan.behavioralTasks)}`,
    `systemDesignTasks: ${JSON.stringify(input.weeklyPlan.systemDesignTasks)}`,
  ].join("\n");
};
