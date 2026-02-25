import mongoose, { Model, Schema, Types } from "mongoose";

export type AiUsageStatus = "processed" | "failed";
export type AiProvider = "openai";

export interface IAiUsage {
  userId: Types.ObjectId;
  feature: string;
  action?: string;
  provider: AiProvider;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  totalTokens: number;
  estimatedCost: number;
  latencyMs: number;
  status: AiUsageStatus;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

type AiUsageModel = Model<IAiUsage>;

const aiUsageSchema = new Schema<IAiUsage, AiUsageModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    feature: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    action: {
      type: String,
      trim: true,
    },
    provider: {
      type: String,
      enum: ["openai"],
      required: true,
      default: "openai",
      index: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    tokensInput: {
      type: Number,
      required: true,
      min: 0,
    },
    tokensOutput: {
      type: Number,
      required: true,
      min: 0,
    },
    totalTokens: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedCost: {
      type: Number,
      required: true,
      min: 0,
    },
    latencyMs: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["processed", "failed"],
      required: true,
      index: true,
    },
    errorCode: {
      type: String,
      trim: true,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    collection: "ai_usage",
  }
);

aiUsageSchema.index({ userId: 1, createdAt: -1 });
aiUsageSchema.index({ feature: 1, createdAt: -1 });
aiUsageSchema.index({ status: 1, createdAt: -1 });
aiUsageSchema.index({ model: 1, createdAt: -1 });

export const AiUsage =
  (mongoose.models.AiUsage as AiUsageModel | undefined) ??
  mongoose.model<IAiUsage, AiUsageModel>("AiUsage", aiUsageSchema);
