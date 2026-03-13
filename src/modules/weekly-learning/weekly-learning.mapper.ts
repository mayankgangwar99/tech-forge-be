import { WeeklyPathResponse } from "./weekly-learning.types";

export const mapWeeklyPathResponse = (doc: any): WeeklyPathResponse => ({
  id: doc._id.toString(),
  planId: doc.planId.toString(),
  userId: doc.userId.toString(),

  content: doc.content,

  providerUsed: doc.providerUsed,
  modelUsed: doc.modelUsed,

  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});