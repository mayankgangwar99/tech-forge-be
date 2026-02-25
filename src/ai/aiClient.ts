import OpenAI from "openai";
import { env } from "../config/env";
import { AppError } from "../utils/appError";


const client = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export const callOpenAI = async (prompt: string): Promise<unknown> => {
  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      temperature: 0.3,
      input: [
        {
          role: "system",
          content: "Return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const outputText = response.output_text?.trim();
    if (!outputText) {
      throw new AppError("Empty AI response", 502);
    }

    try {
      return JSON.parse(outputText) as unknown;
    } catch {
      throw new AppError("Invalid JSON received from AI service", 502);
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("OpenAI request failed", 502, {
      reason: error instanceof Error ? error.message : "Unknown OpenAI error",
    });
  }
};
