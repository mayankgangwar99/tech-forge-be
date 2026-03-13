import mongoose, { Schema, Model } from "mongoose";
import { Types } from "mongoose";
import {
  WeeklyPathEntity,
  DailyLearningItem,
} from "./weekly-learning.types";

/* ============================= */
/* ===== DAILY SUB-SCHEMA ===== */
/* ============================= */

const dailyLearningItemSchema = new Schema<DailyLearningItem>(
  {
    day: {
      type: Number,
      required: true,
      min: 1,
      max: 7,
    },
    dayTitle: {
      type: String,
      required: true,
      trim: true,
    },

    topicsCovered: {
      type: [String],
      required: true,
    },
    learningObjective: {
      type: String,
      required: true,
      trim: true,
    },

    practiceTasks: {
      type: [String],
      default: [],
    },
    behavioralTasks: {
      type: [String],
      default: [],
    },
    systemDesignTasks: {
      type: [String],
      default: [],
    },

    interviewFocus: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

/* ============================= */
/* ===== WEEKLY PATH SCHEMA === */
/* ============================= */

type WeeklyPathModel = Model<WeeklyPathEntity>;

const weeklyPathSchema = new Schema<WeeklyPathEntity, WeeklyPathModel>(
  {
    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /* ===== Core Content ===== */

    content: {
      week: {
        type: Number,
        required: true,
        min: 1,
      },
      focus: {
        type: String,
        required: true,
        trim: true,
      },
      targetRole: {
        type: String,
        required: true,
        trim: true,
      },
      experienceLevel: {
        type: String,
        required: true,
        trim: true,
      },

      dailyLearningPath: {
        type: [dailyLearningItemSchema],
        required: true,
        validate: {
          validator: (v: DailyLearningItem[]) => v.length === 7,
          message: "dailyLearningPath must contain exactly 7 days",
        },
      },
    },

    /* ===== AI Metadata ===== */

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
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

/* ============================= */
/* ===== UNIQUE CONSTRAINT ==== */
/* ============================= */

// One weekly path per plan per week
weeklyPathSchema.index({ planId: 1, "content.week": 1 }, { unique: true });

/* ============================= */
/* ===== MODEL EXPORT ========= */
/* ============================= */

export const WeeklyPath =
  (mongoose.models.WeeklyPath as WeeklyPathModel | undefined) ??
  mongoose.model<WeeklyPathEntity, WeeklyPathModel>(
    "WeeklyPath",
    weeklyPathSchema,
  );
