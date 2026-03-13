import { Types } from "mongoose";
import { ZodError } from "zod";
import logger from "../../config/logger";
import * as aiService from "../../services/ai.service";
import { AppError } from "../../utils/appError";
import { extractText, FileExtractionError } from "../../utils/extractFile";
import { Resume } from "./resume.model";

const resolveFailureReason = (error: unknown): string => {
  if (error instanceof ZodError) {
    return "AI output validation failed";
  }

  if (error instanceof FileExtractionError) {
    return error.message;
  }

  if (error instanceof AppError) {
    return error.message;
  }

  return "Resume analysis failed";
};

export const processResumeAnalysis = async (resumeId: string): Promise<void> => {
  const claim = await Resume.findOneAndUpdate(
    {
      _id: new Types.ObjectId(resumeId),
      softDeleted: false,
      "ai.status": { $in: ["pending", "failed"] },
    },
    {
      $set: {
        "ai.status": "processing",
        "ai.failureReason": undefined,
      },
    },
    { new: true }
  );

  if (!claim) {
    return;
  }

  const startedAt = Date.now();

  try {
    const extractedText = await extractText(claim.file.secureUrl);
    const analysis = await aiService.analyzeResume(extractedText);

    await Resume.updateOne(
      { _id: claim._id, softDeleted: false },
      {
        $set: {
          "ai.status": "processed",
          "ai.model": analysis.model,
          "ai.failureReason": undefined,
          "ai.parsedAt": new Date(),
          insights: analysis.insights,
        },
      }
    );

    logger.info("resume_analysis_processed", {
      userId: claim.userId.toString(),
      feature: "resume-analysis",
      aiModel: analysis.model,
      status: "processed",
      latency: analysis.latencyMs,
    });
  } catch (error) {
    const failureReason = resolveFailureReason(error);

    await Resume.updateOne(
      { _id: claim._id },
      {
        $set: {
          "ai.status": "failed",
          "ai.failureReason": failureReason,
          "ai.parsedAt": new Date(),
        },
        $unset: {
          insights: 1,
        },
      }
    );

    logger.warn("resume_analysis_failed", {
      userId: claim.userId.toString(),
      feature: "resume-analysis",
      aiModel: claim.ai.model,
      status: "failed",
      latency: Date.now() - startedAt,
      message: error instanceof Error ? error.message : "Unknown AI failure",
    });
  }
};
