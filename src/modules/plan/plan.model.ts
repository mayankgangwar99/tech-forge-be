import mongoose, { Model, Schema } from "mongoose";
import { IPlan } from "./plan.types";

type PlanModel = Model<IPlan>;

const planSchema = new Schema<IPlan, PlanModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    resumeId: {
      type: Schema.Types.ObjectId,
      ref: "Resume",
      required: true,
      index: true,
    },

    durationWeeks: {
      type: Number,
      required: true,
      min: 2,
      max: 8,
    },

    // ===== Core AI Output =====
    planData: {
      type: Schema.Types.Mixed,
      required: true,
    },

    planVersion: {
      type: Number,
      default: 1,
    },

    planStatus: {
      type: String,
      enum: ["generated", "in_progress", "completed", "failed"],
      default: "generated",
      index: true,
    },

    // ===== Progress Tracking =====
    progress: {
      totalDays: {
        type: Number,
        required: true,
      },
      completedDayNumbers: {
        type: [Number],
        default: [],
      },
    },

    // ===== AI Metadata =====
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
      inputTokens: { type: Number, default: 0 },
      outputTokens: { type: Number, default: 0 },
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

export const Plan = mongoose.models.Plan ?? mongoose.model<IPlan, PlanModel>("Plan", planSchema);
