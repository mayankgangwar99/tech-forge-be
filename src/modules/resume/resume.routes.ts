import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middlewares/auth.middleware";
import { csrfProtection } from "../../middlewares/csrf.middleware";
import { validateResumeMagicNumber } from "../../middlewares/resumeAnalyse.middleware";
import { resumeUploadRateLimiter } from "../../middlewares/rateLimiter.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { AppError } from "../../utils/appError";
import {
  deleteResumeValidation,
  listResumesValidation,
  uploadResumeValidation,
} from "../../validators/resume.validator";
import * as resumeController from "./resume.controller";

const router = Router();
const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new AppError("Only PDF files are allowed", 400));
      return;
    }
    cb(null, true);
  },
});

router.use(requireAuth);

router.post(
  "/upload",
  csrfProtection,
  resumeUploadRateLimiter,
  uploadPdf.single("resume"),
  validateResumeMagicNumber,
  validate(uploadResumeValidation),
  resumeController.upload
);

router.get("/", validate(listResumesValidation), resumeController.list);
router.delete("/:id", csrfProtection, validate(deleteResumeValidation), resumeController.remove);

export default router;
