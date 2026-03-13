import { callOpenAI } from "../ai/aiClient";
import { callGemini } from "../ai/geminiClient";
import { env } from "../config/env";

export type AiProvider = "gemini" | "openai";

export interface ConfiguredAiResult {
  data: unknown;
  providerUsed: AiProvider;
  modelUsed: string;
}

export const resolveProvider = (): AiProvider => {
  return env.AI_PROVIDER === "openai" ? "openai" : "gemini";
};

export const callConfiguredProvider = async (prompt: string): Promise<ConfiguredAiResult> => {
  const provider = resolveProvider();

  if (provider === "openai") {
    return {
      data: await callOpenAI(prompt),
      providerUsed: "openai",
      modelUsed: env.OPENAI_MODEL,
    };
  }

  return {
    data: await callGemini(prompt),
    providerUsed: "gemini",
    modelUsed: env.GEMINI_MODEL,
  };
};
