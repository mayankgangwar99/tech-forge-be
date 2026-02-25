import { Types } from "mongoose";
import logger from "../../config/logger";
import { deleteObject, generateBufferChecksum, uploadBuffer } from "../../services/storage.service";
import { AppError } from "../../utils/appError";
import { toResumeDTO } from "./resume.mapper";
import { Resume } from "./resume.model";
import { IResume, ResumeDTO, ResumeUploadInput } from "./resume.types";

const getNextVersion = async (userId: Types.ObjectId): Promise<number> => {
  const latest = await Resume.findOne({ userId }).sort({ version: -1 }).select({ version: 1 });
  return (latest?.version ?? 0) + 1;
};

export const uploadResume = async (input: ResumeUploadInput): Promise<ResumeDTO> => {
  const userId = new Types.ObjectId(input.userId);
  const checksum = generateBufferChecksum(input.file.buffer);

  const existingResume = await Resume.findOne({
    userId,
    checksum,
    softDeleted: false,
  });

  if (existingResume) {
    logger.info("resume_upload_duplicate_detected", {
      requestId: input.requestId,
      userId: input.userId,
      feature: "resume-analysis",
      status: existingResume.ai.status,
    });

    return toResumeDTO(existingResume as IResume & { _id: Types.ObjectId });
  }

  const stored = await uploadBuffer({
    buffer: input.file.buffer,
    fileName: input.file.originalname,
    mimeType: input.file.mimetype,
    folder: `resume/${input.userId}`,
  });

  let resume: (IResume & { _id: Types.ObjectId }) | null = null;

  try {
    let attempts = 0;

    while (attempts < 3) {
      attempts += 1;

      try {
        const created = await Resume.create({
          userId,
          version: await getNextVersion(userId),
          checksum,
          file: {
            fileName: input.file.originalname,
            fileSize: stored.bytes,
            mimeType: input.file.mimetype,
            cloudinaryPublicId: stored.publicId,
            secureUrl: stored.secureUrl,
            resourceType: stored.resourceType,
          },
          ai: {
            status: "pending",
          },
          softDeleted: false,
        });
        resume = created as IResume & { _id: Types.ObjectId };
        break;
      } catch (error) {
        if ((error as { code?: number })?.code === 11000) {
          const deduped = await Resume.findOne({ userId, checksum, softDeleted: false });
          if (deduped) {
            await deleteObject(stored.publicId);
            return toResumeDTO(deduped as IResume & { _id: Types.ObjectId });
          }
          continue;
        }

        throw error;
      }
    }
  } catch (error) {
    await deleteObject(stored.publicId);
    throw error;
  }

  if (!resume) {
    await deleteObject(stored.publicId);
    throw new AppError("Unable to persist uploaded resume", 500);
  }

  logger.info("resume_upload_accepted", {
    requestId: input.requestId,
    userId: input.userId,
    feature: "resume-analysis",
    status: "pending",
  });

  return toResumeDTO(resume);
};
