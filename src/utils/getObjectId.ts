import mongoose from "mongoose";

export const getObjectId = (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid ID");
  return new mongoose.Types.ObjectId(id);
};
