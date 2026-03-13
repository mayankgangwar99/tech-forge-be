import { Types } from "mongoose";
import { IResume, ResumeAnalysisDTO, ResumeDTO } from "./resume.types";

export const toResumeDTO = (resume: IResume & { _id: Types.ObjectId }): ResumeDTO => {
  return {
    id: resume._id.toString(),
    userId: resume.userId.toString(),
    version: resume.version,
    checksum: resume.checksum,
    file: resume.file,
    ai: resume.ai,
    insights: resume.insights,
    createdAt: resume.createdAt,
    updatedAt: resume.updatedAt,
  };
};

export const toResumeAnalysisDTO = (resume: IResume & { _id: Types.ObjectId }): ResumeAnalysisDTO => {
  return {
    id: resume._id.toString(),
    userId: resume.userId.toString(),
    resumeScore: resume.resumeScore,
    roleFitScore: resume.roleFitScore,
    strengths: resume.strengths,
    weaknesses: resume.weaknesses,
    missingSkills: resume.missingSkills,
    suggestions: resume.suggestions,
    targetRole: resume.targetRole,
    experienceLevel: resume.experienceLevel,
    ai: resume.ai,
    createdAt: resume.createdAt,
    updatedAt: resume.updatedAt,
  };
};
