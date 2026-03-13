import { buildResumeAnalysisPrompt } from "../../ai/prompts/resume.prompt";
import { callConfiguredProvider } from "../../services/aiProvider.service";
import { extractTextFromPdf } from "../../services/pdfExtractor.service";
import { uploadBuffer } from "../../services/storage.service";
import { AppError } from "../../utils/appError";
import { validateResponse } from "../../utils/validation.util";
import { ResumeAnalysis } from "./resume-analysis.model";
import resumeMapper from "./resume.mapper";
import { Resume } from "./resume.model";
import { getObjectId } from "../../utils/getObjectId";
import { resumeAnalysisSchema } from "./resume.validation";
import { ResumeAnalysisResponse } from "./resume.types";

class ResumeService {
  public async resumeProcessingService(
    fileBuffer: Buffer,
    userId: string,
    role: string,
    experience: string,
  ): Promise<ResumeAnalysisResponse> {
    const stored = await uploadBuffer({
      buffer: fileBuffer,
      fileName: "resume.pdf",
      mimeType: "application/pdf",
      folder: `resumes/${userId}`,
    });
    const cleanedText = await extractTextFromPdf(fileBuffer);
    if (!cleanedText) {
      throw new AppError("No readable text found in resume", 422);
    }
    const prompt = buildResumeAnalysisPrompt(cleanedText, role, experience);
    const aiResult = await callConfiguredProvider(prompt);
    const analysis = validateResponse(resumeAnalysisSchema, aiResult.data);

    const resumeUpsert = resumeMapper.resumeUpsert({
      userId,
      role,
      experience,
      stored,
    });

    let resumeDoc;
    try {
      resumeDoc = await Resume.findOneAndUpdate(
        resumeUpsert.filter,
        resumeUpsert.update,
        resumeUpsert.options,
      );
    } catch (error) {
      if ((error as { code?: number })?.code === 11000) {
        throw new AppError(
          "Duplicate resume metadata detected. Please retry upload.",
          409,
        );
      }
      throw new AppError("Failed to persist resume", 500);
    }

    if (!resumeDoc?._id) {
      throw new AppError("Failed to persist resume", 500);
    }

    const resumeAnalyseUpsert = resumeMapper.resumeAnalyseUpsert({
      resumeId: resumeDoc._id,
      modelUsed: aiResult.modelUsed,
      cleanedText,
      analysis,
    });

    const analysisDoc = await ResumeAnalysis.findOneAndUpdate(
      resumeAnalyseUpsert.filter,
      resumeAnalyseUpsert.update,
      resumeAnalyseUpsert.options,
    );

    if (!analysisDoc) {
      throw new AppError("Failed to persist resume analysis", 500);
    }

    return {
      resumeId: String(resumeDoc._id),
      summary: analysis.summary,
      resumeScore: analysis.resumeScore,
      roleFitScore: analysis.roleFitScore,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      skillMatch: analysis.skillMatch,
      experienceGapAnalysis: analysis.experienceGapAnalysis,
      roleReadinessLevel: analysis.roleReadinessLevel,
      suggestions: analysis.suggestions,
      analysisContext: {
        targetRole: role,
        experienceLevel: experience,
      },
    };
  }

  public async getCurrentAnalysis(
    userId: string,
  ): Promise<ResumeAnalysisResponse> {
    const resume = await Resume.findOne({ userId: userId });
    if (!resume) {
      throw new AppError("No resume found for the user", 404);
    }

    const analysis = await ResumeAnalysis.findOne({ resumeId: resume._id })
      .sort({ createdAt: -1 })
      .select({
        resumeId: 1,
        planId: 1,
        summary: 1,
        resumeScore: 1,
        roleFitScore: 1,
        strengths: 1,
        weaknesses: 1,
        skillMatch: 1,
        experienceGapAnalysis: 1,
        roleReadinessLevel: 1,
        suggestions: 1,
      })
      .lean();

    if (!analysis) {
      throw new AppError("No analysis found for the current resume", 404);
    }

    return {
      resumeId: String(analysis.resumeId),
      planId: analysis.planId ? String(analysis.planId) : undefined,
      summary: analysis.summary ?? "",
      resumeScore: analysis.resumeScore ?? 0,
      roleFitScore: analysis.roleFitScore ?? 0,
      strengths: analysis.strengths ?? [],
      weaknesses: analysis.weaknesses ?? [],
      skillMatch: {
        matched: analysis.skillMatch?.matched ?? [],
        missing: analysis.skillMatch?.missing ?? [],
      },
      experienceGapAnalysis: analysis.experienceGapAnalysis ?? "",
      roleReadinessLevel: analysis.roleReadinessLevel ?? "Low",
      suggestions: analysis.suggestions ?? [],
      analysisContext: {
        targetRole: resume.targetRole ?? "",
        experienceLevel: resume.experienceLevel ?? "",
      },
    };
  }

  public async listResumes(
    userId: string,
    page: number,
    limit: number,
    sort: "newest" | "oldest",
  ) {
    const sortOrder = sort === "oldest" ? 1 : -1;
    limit = Number(limit) || 10;
    page = Number(page) || 1;
    const skip = (page - 1) * limit;
    const userObjectId = getObjectId(userId);

    const [result] = await Resume.aggregate([
      {
        $match: {
          userId: userObjectId,
          softDeleted: false,
        },
      },
      {
        $facet: {
          items: [
            // ✅ index-friendly sort
            { $sort: { createdAt: sortOrder } },
            { $skip: skip },
            { $limit: limit },

            // ✅ reduce document size early
            {
              $project: {
                createdAt: 1,
                targetRole: 1,
                experienceLevel: 1,
                file: {
                  fileName: "$file.fileName",
                  fileSize: "$file.fileSize",
                },
                ai: {
                  status: "$ai.status",
                  lastProcessedAt: "$ai.lastProcessedAt",
                },
              },
            },

            // ✅ latest analysis only
            {
              $lookup: {
                from: "resumeanalyses",
                let: { resumeId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$resumeId", "$$resumeId"] },
                    },
                  },
                  { $sort: { createdAt: -1 } },
                  { $limit: 1 },
                  {
                    $project: {
                      _id: 0,
                      resumeScore: 1,
                      roleFitScore: 1,
                    },
                  },
                ],
                as: "analysis",
              },
            },

            // ✅ final shape
            {
              $project: {
                _id: 0,
                id: { $toString: "$_id" },
                createdAt: 1,
                targetRole: 1,
                experienceLevel: 1,
                file: 1,
                ai: 1,
                analysisSummary: {
                  resumeScore: {
                    $ifNull: [{ $first: "$analysis.resumeScore" }, null],
                  },
                  roleFitScore: {
                    $ifNull: [{ $first: "$analysis.roleFitScore" }, null],
                  },
                },
              },
            },
          ],

          // ✅ independent fast count
          totalCount: [{ $count: "total" }],
        },
      },
    ]);

    const items = result?.items ?? [];
    const total = result?.totalCount?.[0]?.total ?? 0;

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        hasNextPage: page * limit < total,
      },
    };
  }

  public async deleteResume(userId: string, resumeId: string) {
    const resume = await Resume.findOneAndDelete({ _id: resumeId, userId });
    if (!resume) {
      throw new AppError("Resume not found or already deleted", 404);
    }
    await ResumeAnalysis.deleteMany({ resumeId: resume._id });
    // Optionally, delete the file from storage using resume.originalFileUrl or stored.publicId
  }
}

const resumeService = new ResumeService();
export default resumeService;
