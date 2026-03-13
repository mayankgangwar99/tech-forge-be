import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { csrfProtection } from "../../middlewares/csrf.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
  completePlanDayValidation,
  generatePlanValidation,
  listPlansValidation,
} from "../../validators/plan.validator";
import * as planController from "./plan.controller";

const router = Router();

router.use(requireAuth);

// Specific routes first
router.get("/my", planController.currentUserPlan);

// Collection routes
router.get("/", validate(listPlansValidation), planController.list);

// Mutations
router.post(
  "/generate",
  csrfProtection,
  validate(generatePlanValidation),
  planController.generate
);

router.patch(
  "/:id/complete",
  csrfProtection,
  validate(completePlanDayValidation),
  planController.complete
);

export default router;