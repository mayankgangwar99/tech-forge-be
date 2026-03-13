import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { csrfProtection } from "../../middlewares/csrf.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
  generateWeeklyPathController,
  getWeeklyPathController,
} from "./weekly-learning.controller";
import {
  generateWeeklyPathValidation,
  getWeeklyPathValidation,
  markCompleteValidation,
} from "./weekly-learning.validation";

const router = Router();

router.use(requireAuth);

/* ============================= */
/* ===== WEEKLY PATH ROUTES ==== */
/* ============================= */

router.post(
  "/generate",
  csrfProtection,
  validate(generateWeeklyPathValidation),
  generateWeeklyPathController,
);

router.get(
  "/:planId/:week",
  validate(getWeeklyPathValidation),
  getWeeklyPathController,
);

router.get(
  "/:planId/:week/mark-complete/:day",
  validate(markCompleteValidation),
  
);

export default router;
