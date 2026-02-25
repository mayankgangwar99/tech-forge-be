import { Types } from "mongoose";
import { AiUsage, IAiUsage } from "./aiUsage.model";
import {
  AiUsageAdminDTO,
  GetAiUsageForAdminInput,
  PaginatedAiUsageForAdminResult,
} from "./ai.types";

const toAiUsageAdminDTO = (doc: IAiUsage & { _id: Types.ObjectId }): AiUsageAdminDTO => {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    feature: doc.feature,
    action: doc.action,
    provider: doc.provider,
    model: doc.model,
    tokensInput: doc.tokensInput,
    tokensOutput: doc.tokensOutput,
    totalTokens: doc.totalTokens,
    estimatedCost: doc.estimatedCost,
    latencyMs: doc.latencyMs,
    status: doc.status,
    errorCode: doc.errorCode,
    errorMessage: doc.errorMessage,
    metadata: doc.metadata,
    createdAt: doc.createdAt,
  };
};

export const getAiUsageForAdmin = async (
  input: GetAiUsageForAdminInput
): Promise<PaginatedAiUsageForAdminResult> => {
  const skip = (input.page - 1) * input.limit;
  const sortOrder = input.sort === "oldest" ? 1 : -1;
  const filter: Record<string, unknown> = {};

  if (input.userId) {
    filter.userId = new Types.ObjectId(input.userId);
  }
  if (input.feature) {
    filter.feature = input.feature;
  }
  if (input.action) {
    filter.action = input.action;
  }
  if (input.provider) {
    filter.provider = input.provider;
  }
  if (input.status) {
    filter.status = input.status;
  }
  if (input.model) {
    filter.model = input.model;
  }
  if (input.fromDate || input.toDate) {
    const createdAtFilter: { $gte?: Date; $lte?: Date } = {};
    if (input.fromDate) {
      createdAtFilter.$gte = input.fromDate;
    }
    if (input.toDate) {
      createdAtFilter.$lte = input.toDate;
    }
    filter.createdAt = createdAtFilter;
  }

  const [items, total] = await Promise.all([
    AiUsage.find(filter).sort({ createdAt: sortOrder }).skip(skip).limit(input.limit),
    AiUsage.countDocuments(filter),
  ]);

  return {
    items: items.map((item) => toAiUsageAdminDTO(item as IAiUsage & { _id: Types.ObjectId })),
    page: input.page,
    limit: input.limit,
    total,
    hasNextPage: skip + items.length < total,
  };
};
