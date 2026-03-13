import { Types } from "mongoose";
import { toResumeDTO } from "./resume.mapper";
import { Resume } from "./resume.model";
import { IResume, PaginatedResumeResult, ResumeListInput } from "./resume.types";

export const listResumes = async (input: ResumeListInput): Promise<PaginatedResumeResult> => {
  const userId = new Types.ObjectId(input.userId);
  const skip = (input.page - 1) * input.limit;
  const sortOrder = input.sort === "oldest" ? 1 : -1;

  const [resumes, total] = await Promise.all([
    Resume.find({
      userId,
      softDeleted: false,
    })
      .sort({ createdAt: sortOrder })
      .skip(skip)
      .limit(input.limit),
    Resume.countDocuments({
      userId,
      softDeleted: false,
    }),
  ]);

  return {
    items: resumes.map((resume) => toResumeDTO(resume as IResume & { _id: Types.ObjectId })),
    page: input.page,
    limit: input.limit,
    total,
    hasNextPage: skip + resumes.length < total,
  };
};
