import { Types } from "mongoose";
import { AiProvider, AiUsageStatus } from "./aiUsage.model";

export interface InsertAiUsageInput {
  userId: Types.ObjectId | string;
  feature: string;
  action?: string;
  provider?: AiProvider;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  totalTokens: number;
  latencyMs: number;
  status: AiUsageStatus;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  estimatedCost?: number;
}

export interface GetAiUsageForAdminInput {
  page: number;
  limit: number;
  sort?: "newest" | "oldest";
  userId?: string;
  feature?: string;
  action?: string;
  provider?: AiProvider;
  status?: AiUsageStatus;
  model?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface AiUsageAdminDTO {
  id: string;
  userId: string;
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

export interface PaginatedAiUsageForAdminResult {
  items: AiUsageAdminDTO[];
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
}
