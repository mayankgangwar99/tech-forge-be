import { Types } from "mongoose";

export interface ChatTokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface IChatMessage {
  userId: Types.ObjectId;
  role: "user" | "assistant";
  message: string;
  providerUsed: "gemini" | "openai";
  modelUsed: string;
  tokenUsage: ChatTokenUsage;
  relatedPlanId?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SendChatMessageInput {
  userId: string;
  message: string;
  relatedPlanId?: string;
}
