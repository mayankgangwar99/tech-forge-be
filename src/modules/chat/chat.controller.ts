import { Request, Response } from "express";
import { AppError } from "../../utils/appError";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { deleteChatMessage, listChatMessages, sendChatMessage } from "./chat.service";

export const message = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const assistantMessage = await sendChatMessage({
    userId: req.user.id,
    message: req.body.message as string,
    relatedPlanId: req.body.relatedPlanId as string | undefined,
  });

  return sendSuccess(res, 200, "Assistant response generated successfully", assistantMessage);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const page = Number(req.query.page);
  const limit = Number(req.query.limit);

  const result = await listChatMessages({
    userId: req.user.id,
    page,
    limit,
  });

  return sendSuccess(res, 200, "Chat messages fetched successfully", result.items, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    hasNextPage: result.hasNextPage,
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const chatId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const deleted = await deleteChatMessage({
    userId: req.user.id,
    chatId,
  });

  return sendSuccess(res, 200, "Chat message deleted successfully", deleted);
});
