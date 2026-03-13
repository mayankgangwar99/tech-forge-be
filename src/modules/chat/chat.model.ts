import mongoose, { Model, Schema } from "mongoose";
import { IChatMessage } from "./chat.types";

type ChatModel = Model<IChatMessage>;

const chatSchema = new Schema<IChatMessage, ChatModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 8000,
    },
    providerUsed: {
      type: String,
      enum: ["gemini", "openai"],
      required: true,
    },
    modelUsed: {
      type: String,
      required: true,
      trim: true,
    },
    tokenUsage: {
      inputTokens: {
        type: Number,
        default: 0,
      },
      outputTokens: {
        type: Number,
        default: 0,
      },
    },
    relatedPlanId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

chatSchema.index({ userId: 1, createdAt: 1 });

export const ChatMessage =
  (mongoose.models.ChatMessage as ChatModel | undefined) ??
  mongoose.model<IChatMessage, ChatModel>("ChatMessage", chatSchema);
