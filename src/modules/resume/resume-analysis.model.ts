import mongoose, { Schema, Model } from "mongoose";
import { IResumeAnalysis } from "./resume.types";

type ResumeAnalysisModel = Model<IResumeAnalysis>;

const resumeAnalysisSchema = new Schema<IResumeAnalysis, ResumeAnalysisModel>(
  {
    resumeId: {
      type: Schema.Types.ObjectId,
      ref: "Resume",
      required: true,
      index: true,
    },

    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      index: true,
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

    resumeScore: {
      type: Number,
      min: 0,
      max: 100,
    },

    roleFitScore: {
      type: Number,
      min: 0,
      max: 100,
    },

    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    strengths: {
      type: [String],
      default: [],
    },

    weaknesses: {
      type: [String],
      default: [],
    },

    skillMatch: {
      matched: {
        type: [String],
        default: [],
      },
      missing: {
        type: [String],
        default: [],
      },
    },

    experienceGapAnalysis: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    roleReadinessLevel: {
      type: String,
      enum: ["Low", "Medium", "High"],
      required: true,
    },

    suggestions: {
      type: [String],
      default: [],
    },

    extractedTextSummary: {
      type: String,
      trim: true,
      maxlength: 10000,
    },

    insights: {
      type: Schema.Types.Mixed,
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
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

resumeAnalysisSchema.index({ resumeId: 1, createdAt: -1 });


export const ResumeAnalysis =
  mongoose.models.ResumeAnalysis ??
  mongoose.model<IResumeAnalysis, ResumeAnalysisModel>(
    "ResumeAnalysis",
    resumeAnalysisSchema,
  );
