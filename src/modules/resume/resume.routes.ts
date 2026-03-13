// src/routes/resume.routes.ts
import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { csrfProtection } from "../../middlewares/csrf.middleware";
import { resumeUploadRateLimiter } from "../../middlewares/rateLimiter.middleware";
import {
  resumeUpload,
  validateResumeMagicNumber,
} from "../../middlewares/resumeAnalyse.middleware";
import { uploadResumeValidation } from "./resume.validation";
import { validate } from "../../middlewares/validate.middleware";
import {
  currentAnalysis,
  list,
  uploadResume,
  deleteResume,
} from "./resume.controller";
import {
  deleteResumeValidation,
  listResumesValidation,
} from "../../validators/resume.validator";

const router = Router();
router.use(requireAuth);

router.post(
  "/upload",
  csrfProtection,
  resumeUploadRateLimiter,
  resumeUpload.single("resume"),
  validateResumeMagicNumber,
  validate(uploadResumeValidation),
  uploadResume,
);

router.get("/analysis", csrfProtection, currentAnalysis);
router.get("/", list);
router.delete(
  "/:id",
  csrfProtection,
  validate(deleteResumeValidation),
  deleteResume,
);

export default router;
