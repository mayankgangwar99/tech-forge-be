import { Types } from "mongoose";
import { z } from "zod";

export const sendChatMessageValidation = {
  body: z.object({
    message: z.string().trim().min(1).max(4000),
    relatedPlanId: z
      .string()
      .trim()
      .refine((value) => Types.ObjectId.isValid(value), "Invalid related plan id")
      .optional(),
  }),
};

export const listChatValidation = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
};

export const deleteChatMessageValidation = {
  params: z.object({
    id: z
      .string()
      .trim()
      .refine((value) => Types.ObjectId.isValid(value), "Invalid chat id"),
  }),
};
