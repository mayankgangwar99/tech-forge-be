import { Readable } from "stream";
import { Types } from "mongoose";
import { PDFParse } from "pdf-parse";
import { z } from "zod";
import { buildResumeAnalysisPrompt } from "../../ai/prompts/resume.prompt";
import { cloudinary } from "../../config/cloudinary";
import { generateBufferChecksum } from "../../services/storage.service";
import { AppError } from "../../utils/appError";
import { enqueueResumeAnalysis } from "./resume.analysis.service";
import { processResumeAnalysis } from "./resume.analysis.worker";
import { deleteResume } from "./resume.delete.service";
import { listResumes } from "./resume.list.service";
import { Resume } from "./resume.model";
import { ResumeProcessingResult } from "./resume.types";
import { uploadResume } from "./resume.upload.service";
import { callGemini } from "../../ai/geminiClient";

const MAX_RESUME_TEXT_CHARS = 12_000;

const analysisSchema = z.object({
  resumeScore: z.number(),
  roleFitScore: z.number(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  missingSkills: z.array(z.string()),
  suggestions: z.array(z.string()),
});

export const uploadToCloudinary = async (
  buffer: Buffer
): Promise<{ secureUrl: string; publicId: string }> => {
  const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "resumes",
        resource_type: "raw",
      },
      (error, uploaded) => {
        if (error || !uploaded?.secure_url || !uploaded.public_id) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve({ secure_url: uploaded.secure_url, public_id: uploaded.public_id });
      }
    );

    Readable.from(buffer).pipe(stream);
  });

  return {
    secureUrl: result.secure_url,
    publicId: result.public_id,
  };
};

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

const validateAnalysis = (payload: unknown): ResumeProcessingResult => {
  const parsed = analysisSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError("Invalid analysis format from AI service", 502, parsed.error.flatten());
  }
  return parsed.data;
};

export const processResume = async (
  fileBuffer: Buffer,
  userId: string,
  role: string,
  experience: string
): Promise<ResumeProcessingResult> => {
  try {
    const originalFileUrl = await uploadToCloudinary(fileBuffer);
    const extractedText = await extractTextFromPdf(fileBuffer);
    const cleanedText = preprocessResumeText(extractedText);

    if (!cleanedText) {
      throw new AppError("No readable text found in resume", 422);
    }

    const prompt = buildResumeAnalysisPrompt(cleanedText, role, experience);
    const aiRaw = await callGemini(prompt);
    const analysis = validateAnalysis(aiRaw);

    const checksum = generateBufferChecksum(fileBuffer);

    const userObjectId = new Types.ObjectId(userId);
    await Resume.findOneAndUpdate(
      { userId: userObjectId, softDeleted: false },
      {
        $set: {
          originalFileUrl: originalFileUrl.secureUrl,
          extractedText: cleanedText,
          resumeScore: analysis.resumeScore,
          roleFitScore: analysis.roleFitScore,
          strengths: analysis.strengths,
          weaknesses: analysis.weaknesses,
          missingSkills: analysis.missingSkills,
          suggestions: analysis.suggestions,
          checksum,
          "file.fileName": "resume.pdf",
          "file.fileSize": fileBuffer.length,
          "file.mimeType": "application/pdf",
          "file.cloudinaryPublicId": originalFileUrl.publicId,
          "file.secureUrl": originalFileUrl.secureUrl,
          "file.resourceType": "raw",
          "ai.status": "processed",
          "ai.model": "gpt-4.1-mini",
          "ai.parsedAt": new Date(),
          "ai.failureReason": undefined,
          insights: {
            summary: "",
            experience_years: 0,
            skills: [],
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

