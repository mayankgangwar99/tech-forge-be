import { Types } from "mongoose";
import { IResume, ResumeDTO } from "./resume.types";

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
