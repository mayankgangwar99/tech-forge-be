import { ZodSchema } from "zod";
import { AppError } from "../utils/appError"; // adjust path

export function validateResponse<T>(
  schema: ZodSchema<T>,
  payload: unknown,
  errorMessage = "Invalid response format"
): T {
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw new AppError(errorMessage, 502, parsed.error.flatten());
  }

  return parsed.data;
}