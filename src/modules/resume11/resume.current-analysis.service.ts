import { Types } from "mongoose";
import { AppError } from "../../utils/appError";
import { toResumeAnalysisDTO } from "./resume.mapper";
import { Resume } from "./resume.model";
import { IResume, ResumeAnalysisDTO } from "./resume.types";

export const getCurrentUserResumeAnalysis = async (userId: string): Promise<ResumeAnalysisDTO> => {
  const resume = await Resume.findOne({
    userId: new Types.ObjectId(userId),
    softDeleted: false,
  }).sort({ createdAt: -1 });

  if (!resume) {
    throw new AppError("Resume not found", 404);
  }

  return toResumeAnalysisDTO(resume as IResume & { _id: Types.ObjectId });
};
