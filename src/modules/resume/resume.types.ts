import { Types } from "mongoose";
import { ResumeInsights } from "../../services/ai.service";

export interface ResumeFileMeta {
  fileName: string;
  fileSize: number;
  mimeType: string;
  cloudinaryPublicId: string;
  secureUrl: string;
  resourceType: string;
}

export interface ResumeAiMeta {
  status: "pending" | "processing" | "processed" | "failed";
  model?: string;
  parsedAt?: Date;
  failureReason?: string;
}

export interface IResume {
  userId: Types.ObjectId;
  originalFileUrl?: string;
  extractedText?: string;
  resumeScore?: number;
  roleFitScore?: number;
  strengths?: string[];
  weaknesses?: string[];
  missingSkills?: string[];
  suggestions?: string[];
  version: number;
  checksum: string;
  file: ResumeFileMeta;
  ai: ResumeAiMeta;
  insights?: ResumeInsights;
  softDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ResumeUploadInput {
  userId: string;
  file: Express.Multer.File;
  requestId?: string;
}

export interface ResumeProcessingResult {
  resumeScore: number;
  roleFitScore: number;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  suggestions: string[];
}

export interface ResumeListInput {
  userId: string;
  page: number;
  limit: number;
  sort: "newest" | "oldest";
}

export interface ResumeDTO {
  id: string;
  userId: string;
  version: number;
  checksum: string;
  file: ResumeFileMeta;
  ai: ResumeAiMeta;
  insights?: ResumeInsights;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaginatedResumeResult {
  items: ResumeDTO[];
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
}
