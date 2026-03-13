import { Types } from "mongoose";

/* ============================= */
/* ===== PLAN CORE STRUCT ===== */
/* ============================= */

export interface WeeklyPlanItem {
  week: number;
  focus: string;
  topics: string[];
  practiceTasks: string[];
  behavioralTasks: string[];
  systemDesignTasks: string[];
  isDailyPlanGenerated: boolean;
}

export interface PlanData {
  durationWeeks: number;
  weeklyPlan: WeeklyPlanItem[];
  dailyHabitSuggestion: string;
  milestoneGoal: string;
}

/* ============================= */
/* ===== PROGRESS STRUCT ====== */
/* ============================= */

export interface PlanProgress {
  totalDays: number;
  completedDayNumbers: number[];
}

/* ============================= */
/* ===== TOKEN TRACKING ======= */
/* ============================= */

export interface PlanTokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/* ============================= */
/* ===== PLAN STATUS ========= */
/* ============================= */

export type PlanStatus =
  | "generated"
  | "in_progress"
  | "completed"
  | "failed";

/* ============================= */
/* ===== MAIN PLAN MODEL ====== */
/* ============================= */

export interface IPlan {
  userId: Types.ObjectId;
  resumeId: Types.ObjectId;
  durationWeeks: number;

  // AI Output
  planData: PlanData;
  planVersion: number;
  planStatus: PlanStatus;

  // Progress
  progress: PlanProgress;

  // AI Metadata
  providerUsed: "gemini" | "openai";
  modelUsed: string;
  tokenUsage: PlanTokenUsage;

  // System
  createdAt?: Date;
  updatedAt?: Date;
}

/* ============================= */
/* ===== INPUT TYPES ========== */
/* ============================= */

export interface GeneratePlanInput {
  userId: string;
  resumeId: string;
  durationWeeks: number;
}

export interface MarkDayCompleteInput {
  planId: string;
  dayNumber: number;
  userId: string;
}