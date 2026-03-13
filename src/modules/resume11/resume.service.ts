import { Types } from "mongoose";
import { PDFParse } from "pdf-parse";
import { buildResumeAnalysisPrompt } from "../../ai/prompts/resume.prompt";
import { callConfiguredProvider } from "../../services/aiProvider.service";
import { uploadBuffer } from "../../services/storage.service";
import { AppError } from "../../utils/appError";
import { enqueueResumeAnalysis } from "./resume.analysis.service";
import { processResumeAnalysis } from "./resume.analysis.worker";
import { deleteResume } from "./resume.delete.service";
import { listResumes } from "./resume.list.service";
import { Resume } from "./resume.model";
import { uploadResume } from "./resume.upload.service";
import { ResumeProcessingResult } from "./resume.types";
import { validateResumeAnalysisOutput } from "./resume.validation";

const MAX_RESUME_TEXT_CHARS = 12_000;

export const extractTextFromPdf = async (buffer: Buffer): Promise<string> => {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const parsed = await parser.getText();
    return parsed.text ?? "";
  } finally {
    await parser.destroy();
  }
};

export const preprocessResumeText = (text: string): string => {
  return text
    .replace(/[^\x00-\x7F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_RESUME_TEXT_CHARS);
};

export const processResume = async (
  fileBuffer: Buffer,
  userId: string,
  role: string,
  experience: string
): Promise<ResumeProcessingResult> => {
  try {
    const stored = await uploadBuffer({
      buffer: fileBuffer,
      fileName: "resume.pdf",
      mimeType: "application/pdf",
      folder: `resumes/${userId}`,
    });
    const extractedText = await extractTextFromPdf(fileBuffer);
    const cleanedText = preprocessResumeText(extractedText);

    if (!cleanedText) {
      throw new AppError("No readable text found in resume", 422);
    }

    const prompt = buildResumeAnalysisPrompt(cleanedText, role, experience);
    const aiResult = await callConfiguredProvider(prompt);
    const analysis = validateResumeAnalysisOutput(aiResult.data);

    const userObjectId = new Types.ObjectId(userId);
    await Resume.findOneAndUpdate(
      { userId: userObjectId, softDeleted: false },
      {
        $set: {
          originalFileUrl: stored.secureUrl,
          extractedText: cleanedText,
          resumeScore: analysis.resumeScore,
          roleFitScore: analysis.roleFitScore,
          strengths: analysis.strengths,
          weaknesses: analysis.weaknesses,
          missingSkills: analysis.skillMatch.missing,
          suggestions: analysis.suggestions,
          targetRole: role,
          experienceLevel: experience,
          checksum: stored.checksum,
          "file.fileName": "resume.pdf",
          "file.fileSize": stored.bytes,
          "file.mimeType": "application/pdf",
          "file.cloudinaryPublicId": stored.publicId,
          "file.secureUrl": stored.secureUrl,
          "file.resourceType": stored.resourceType,
          "ai.status": "processed",
          "ai.model": aiResult.modelUsed,
          "ai.parsedAt": new Date(),
          "ai.failureReason": undefined,
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
          softDeleted: false,
        },
        $setOnInsert: {
          userId: userObjectId,
          version: 1,
        },
      },
      {
        upsert: true,
        new: true,
        sort: { createdAt: -1 },
      }
    );

    return analysis;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Failed to process resume", 500, {
      reason: error instanceof Error ? error.message : "Unknown processing error",
    });
  }
};

export { uploadResume, listResumes, deleteResume, enqueueResumeAnalysis, processResumeAnalysis };


