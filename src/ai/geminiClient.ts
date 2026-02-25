import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { env } from "../config/env";
import { AppError } from "../utils/appError";

let modelInstance: GenerativeModel | null = null;

const getModel = (): GenerativeModel => {
  if (!modelInstance) {
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

    modelInstance = genAI.getGenerativeModel({
      model: env.GEMINI_MODEL,
    });
  }

  return modelInstance;
};

const cleanJson = (text: string): string => {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
};

export const callGemini = async (prompt: string): Promise<unknown> => {
  const model = getModel();

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You must return ONLY valid JSON.
                     Do not include explanations.
                     Do not include markdown.
                     Do not include text outside JSON.
                    ${prompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: env.GEMINI_TEMPERATURE,
      },
    });

    const outputText = result.response.text()?.trim();

    if (!outputText) {
      throw new AppError("Empty AI response", 502);
    }

    const cleaned = cleanJson(outputText);

    try {
      return JSON.parse(cleaned);
    } catch {
      throw new AppError("Invalid JSON received from Gemini service", 502);
    }
  } catch (error: any) {
    // Handle quota retry hint (Gemini gives retryDelay)
    if (error?.message?.includes("Too Many Requests")) {
      throw new AppError("Gemini rate limit exceeded", 429);
    }

    throw new AppError("Gemini request failed", 502, {
      reason: error instanceof Error ? error.message : "Unknown Gemini error",
    });
  }
};
