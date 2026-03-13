import { Types } from "mongoose";

/* ============================= */
/* ===== DAILY LEARNING ITEM === */
/* ============================= */

export interface DailyLearningItem {
  day: number; // 1–7 (within a week)
  dayTitle: string;
  isComplete?: boolean;

  topicsCovered: string[];
  learningObjective: string;

  practiceTasks: string[];
  behavioralTasks: string[];
  systemDesignTasks: string[];

  interviewFocus: string;
}

/* ============================= */
/* ===== WEEKLY PATH CONTENT == */
/* ============================= */

export interface WeeklyPathContent {
  week: number;
  focus: string;

  targetRole: string;
  experienceLevel: string;

  dailyLearningPath: DailyLearningItem[];
}

/* ============================= */
/* ===== WEEKLY PATH MODEL ==== */
/* ============================= */

export interface WeeklyPathEntity {
  _id?: Types.ObjectId;

  planId: Types.ObjectId;
  userId: Types.ObjectId;

  content: WeeklyPathContent;

  providerUsed: "gemini" | "openai";
  modelUsed: string;

  createdAt?: Date;
  updatedAt?: Date;
}

/* ============================= */
/* ===== MAIN RESPONSE ======== */
/* ============================= */

export interface WeeklyPathResponse {
  id: string;
  planId: string;
  userId: string;
  content: WeeklyPathContent;
  providerUsed: "gemini" | "openai";
  modelUsed: string;
  createdAt: string;
  updatedAt: string;
}
