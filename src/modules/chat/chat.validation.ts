import { z } from "zod";
import { AppError } from "../../utils/appError";

const assistantResponseSchema = z.object({
  assistantMessage: z.string().min(1),
});

export const validateAssistantResponse = (raw: unknown): { assistantMessage: string } => {
  const parsed = assistantResponseSchema.safeParse(raw);

  if (!parsed.success) {
    throw new AppError("Invalid AI response format", 502, parsed.error.flatten());
  }

  return parsed.data;
};
