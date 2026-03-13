import { Types } from "mongoose";
import { buildChatConversationPrompt } from "../../ai/prompts/chat.prompt";
import { callConfiguredProvider, resolveProvider } from "../../services/aiProvider.service";
import { env } from "../../config/env";
import { AppError } from "../../utils/appError";
import { Plan } from "../plan/plan.model";
import { ChatMessage } from "./chat.model";
import { SendChatMessageInput } from "./chat.types";
import { validateAssistantResponse } from "./chat.validation";

export const sendChatMessage = async (input: SendChatMessageInput) => {
  const userId = new Types.ObjectId(input.userId);

  let relatedPlanObjectId: Types.ObjectId | undefined;
  if (input.relatedPlanId) {
    if (!Types.ObjectId.isValid(input.relatedPlanId)) {
      throw new AppError("Invalid related plan id", 400);
    }

    relatedPlanObjectId = new Types.ObjectId(input.relatedPlanId);
    const plan = await Plan.findOne({
      _id: relatedPlanObjectId,
      userId,
    }).select({ _id: 1 });

    if (!plan) {
      throw new AppError("Related plan not found", 404);
    }
  }

  const providerUsed = resolveProvider();
  const modelUsed = providerUsed === "openai" ? env.OPENAI_MODEL : env.GEMINI_MODEL;

  await ChatMessage.create({
    userId,
    role: "user",
    message: input.message,
    providerUsed,
    modelUsed,
    tokenUsage: {
      inputTokens: 0,
      outputTokens: 0,
    },
    relatedPlanId: relatedPlanObjectId,
  });

  const recentMessages = await ChatMessage.find({ userId }).sort({ createdAt: -1 }).limit(10).lean();
  const history = recentMessages
    .reverse()
    .map((item) => ({ role: item.role, message: item.message as string }));

  const prompt = buildChatConversationPrompt(history);
  const ai = await callConfiguredProvider(prompt);
  const parsed = validateAssistantResponse(ai.data);

  const savedAssistantMessage = await ChatMessage.create({
    userId,
    role: "assistant",
    message: parsed.assistantMessage,
    providerUsed: ai.providerUsed,
    modelUsed: ai.modelUsed,
    tokenUsage: {
      inputTokens: 0,
      outputTokens: 0,
    },
    relatedPlanId: relatedPlanObjectId,
  });

  return savedAssistantMessage;
};

export const listChatMessages = async (input: { userId: string; page: number; limit: number }) => {
  const userId = new Types.ObjectId(input.userId);
  const skip = (input.page - 1) * input.limit;

  const [items, total] = await Promise.all([
    ChatMessage.find({ userId }).sort({ createdAt: 1 }).skip(skip).limit(input.limit),
    ChatMessage.countDocuments({ userId }),
  ]);

  return {
    items,
    page: input.page,
    limit: input.limit,
    total,
    hasNextPage: skip + items.length < total,
  };
};

export const deleteChatMessage = async (input: { userId: string; chatId: string }) => {
  if (!Types.ObjectId.isValid(input.chatId)) {
    throw new AppError("Invalid chat id", 400);
  }

  const result = await ChatMessage.findOneAndDelete({
    _id: new Types.ObjectId(input.chatId),
    userId: new Types.ObjectId(input.userId),
  });

  if (!result) {
    throw new AppError("Chat message not found", 404);
  }

  return result;
};
