import mongoose, { Model, Schema } from "mongoose";
import { IResume } from "./resume.types";

type ResumeModel = Model<IResume>;

const resumeSchema = new Schema<IResume, ResumeModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    originalFileUrl: {
      type: String,
      trim: true,
    },
    extractedText: {
      type: String,
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
    strengths: {
      type: [String],
      default: undefined,
    },
    weaknesses: {
      type: [String],
      default: undefined,
    },
    missingSkills: {
      type: [String],
      default: undefined,
    },
    suggestions: {
      type: [String],
      default: undefined,
    },
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    checksum: {
      type: String,
      required: true,
      trim: true,
      minlength: 64,
      maxlength: 64,
    },
    file: {
      fileName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 255,
      },
      fileSize: {
        type: Number,
        required: true,
        min: 1,
      },
      mimeType: {
        type: String,
        required: true,
        trim: true,
      },
      cloudinaryPublicId: {
        type: String,
        required: true,
        trim: true,
      },
      secureUrl: {
        type: String,
        required: true,
        trim: true,
      },
      resourceType: {
        type: String,
        required: true,
        trim: true,
      },
    },
    ai: {
      status: {
        type: String,
        enum: ["pending", "processing", "processed", "failed"],
        required: true,
      },
      model: {
        type: String,
        trim: true,
      },
      parsedAt: {
        type: Date,
      },
      failureReason: {
        type: String,
        trim: true,
        maxlength: 2000,
      },
    },
    insights: {
      type: Schema.Types.Mixed,
    },
    softDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

resumeSchema.index({ userId: 1, createdAt: -1 });
resumeSchema.index({ userId: 1, checksum: 1 }, { unique: true });
resumeSchema.index({ userId: 1, version: -1 }, { unique: true });

export const Resume =
  (mongoose.models.Resume as ResumeModel | undefined) ??
  mongoose.model<IResume, ResumeModel>("Resume", resumeSchema);
