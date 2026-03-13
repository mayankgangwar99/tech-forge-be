import { Types } from "mongoose";
import * as storageService from "../../services/storage.service";
import { AppError } from "../../utils/appError";
import { Resume } from "./resume.model";

export const deleteResume = async (userId: string, resumeId: string): Promise<void> => {
  const userObjectId = new Types.ObjectId(userId);
  const resumeObjectId = new Types.ObjectId(resumeId);

  const resume = await Resume.findOne({
    _id: resumeObjectId,
    userId: userObjectId,
    softDeleted: false,
  });

  if (!resume) {
    throw new AppError("Resume not found", 404);
  }

  await storageService.deleteObject(resume.file.cloudinaryPublicId);

  await Resume.updateOne(
    { _id: resumeObjectId, userId: userObjectId, softDeleted: false },
    { $set: { softDeleted: true } }
  );
};
