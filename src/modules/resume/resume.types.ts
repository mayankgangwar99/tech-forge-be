import { Types } from "mongoose";
import { ResumeInsights } from "../../services/ai.service";

export type StorageProvider = "cloudinary" | "s3";

export type AIStatus = "pending" | "processing" | "processed" | "failed";

export interface IResumeFile {
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageProvider: StorageProvider;
  publicId: string;
  secureUrl: string;
}

export interface IResumeAI {
  status: AIStatus;
  lastProcessedAt?: Date;
  failureReason?: string;
}

export interface IResume {
  _id?: Types.ObjectId;

  userId: Types.ObjectId;
  originalFileUrl: string;
  targetRole?: string;
  experienceLevel?: string;

  version: number;
  checksum: string;

  file: IResumeFile;

  ai: IResumeAI;

  softDeleted: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export type AIProvider = "gemini" | "openai";

export interface ITokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface IResumeAnalysis {
  _id?: Types.ObjectId;

  resumeId: Types.ObjectId;
  planId?: Types.ObjectId;

  providerUsed: AIProvider;
  modelUsed: string;

  resumeScore?: number;
  roleFitScore?: number;

  summary: string;
  strengths: string[];
  weaknesses: string[];
  skillMatch: {
    matched: string[];
    missing: string[];
  };
  experienceGapAnalysis: string;
  roleReadinessLevel: "Low" | "Medium" | "High";
  suggestions: string[];

  extractedTextSummary?: string;

  insights?: ResumeInsights;

  tokenUsage: ITokenUsage;

  createdAt?: Date;
  updatedAt?: Date;
}


export interface ResumeUpsertParams {
  userId: string;
  role: string;
  experience: string;
  stored: {
    checksum: string;
    secureUrl: string;
    bytes: number;
    publicId: string;
  };
}
export interface ResumeAnalyseUpsertParams {
  resumeId: Types.ObjectId;
  modelUsed: string;
  cleanedText: string;
  analysis: {
    summary: string;
    resumeScore: number;
    roleFitScore: number;
    strengths: string[];
    weaknesses: string[];
    skillMatch: {
      matched: string[];
      missing: string[];
    };
    experienceGapAnalysis: string;
    roleReadinessLevel: "Low" | "Medium" | "High";
    suggestions: string[];
  };
}

export interface ResumeAnalysisResponse {
  resumeId: string;
  planId?: string;
  analysisContext: {
    targetRole: string;
    experienceLevel: string;
  };
  summary: string;
  resumeScore: number;
  roleFitScore: number;
  strengths: string[];
  weaknesses: string[];
  skillMatch: {
    matched: string[];
    missing: string[];
  };
  experienceGapAnalysis: string;
  roleReadinessLevel: "Low" | "Medium" | "High";
  suggestions: string[];
}


export interface FileMeta {
  fileName: string;
  fileSize: number;
}

export interface IAIStatus {
  status: string;
  lastProcessedAt?: Date;
}

export interface AnalysisSummary {
  resumeScore: number | null;
  roleFitScore: number | null;
}

export interface ResumeListItem {
  id: string;
  createdAt: Date;
  targetRole?: string;
  experienceLevel?: string;
  file: FileMeta;
  ai: IAIStatus;
  analysisSummary: AnalysisSummary;
}

export interface ResumeListAggregationResult {
  items: ResumeListItem[];
  totalCount: { total: number }[];
}


