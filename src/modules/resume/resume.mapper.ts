import { getObjectId } from "../../utils/getObjectId";
import { ResumeAnalyseUpsertParams, ResumeUpsertParams } from "./resume.types";

class ResumeMapper {
  public resumeUpsert({
    userId,
    role,
    experience,
    stored,
  }: ResumeUpsertParams) {
    const userObjectId = getObjectId(userId);
    return {
      filter: {
        userId: userObjectId,
      },
      update: {
        $set: {
          targetRole: role,
          experienceLevel: experience,
          checksum: stored.checksum,
          originalFileUrl: stored.secureUrl,
          "file.fileName": "resume.pdf",
          "file.fileSize": stored.bytes,
          "file.mimeType": "application/pdf",
          "file.storageProvider": "cloudinary",
          "file.publicId": stored.publicId,
          "file.secureUrl": stored.secureUrl,
          "ai.status": "processed",
          "ai.lastProcessedAt": new Date(),
          "ai.failureReason": undefined,
          softDeleted: false,
        },
        $setOnInsert: {
          userId: userObjectId,
          version: 1,
        },
      },
      options: {
        upsert: true,
        new: true,
        sort: { createdAt: -1 },
      },
    };
  }

  public resumeAnalyseUpsert({
    resumeId,
    modelUsed,
    cleanedText,
    analysis,
  }: ResumeAnalyseUpsertParams) {
    return {
      filter: {
        resumeId,
      },
      update: {
        $set: {
          providerUsed: "gemini",
          modelUsed,
          summary: analysis.summary,
          resumeScore: analysis.resumeScore,
          roleFitScore: analysis.roleFitScore,
          strengths: analysis.strengths,
          weaknesses: analysis.weaknesses,
          "skillMatch.matched": analysis.skillMatch.matched,
          "skillMatch.missing": analysis.skillMatch.missing,
          experienceGapAnalysis: analysis.experienceGapAnalysis,
          roleReadinessLevel: analysis.roleReadinessLevel,
          suggestions: analysis.suggestions,
          extractedTextSummary: cleanedText,
          insights: {
            summary: analysis.summary,
            experience_years: 0,
            skills: analysis.skillMatch.matched,
            education: [],
            projects: [],
            strengths: analysis.strengths,
            gaps: analysis.weaknesses,
            job_fit_score: analysis.roleFitScore,
            improvement_suggestions: analysis.suggestions,
          },
          tokenUsage: {
            inputTokens: 0,
            outputTokens: 0,
          },
        },
        $setOnInsert: {
          resumeId,
        },
      },
      options: {
        upsert: true,
        new: true,
        sort: { createdAt: -1 },
      },
    };
  }
}

const resumeMapper = new ResumeMapper();

export default resumeMapper;
export { ResumeMapper };
