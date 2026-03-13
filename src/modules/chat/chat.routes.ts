import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { csrfProtection } from "../../middlewares/csrf.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
  deleteChatMessageValidation,
  listChatValidation,
  sendChatMessageValidation,
} from "../../validators/chat.validator";
import * as chatController from "./chat.controller";

const router = Router();

router.use(requireAuth);

router.post("/message", csrfProtection, validate(sendChatMessageValidation), chatController.message);
router.get("/", validate(listChatValidation), chatController.list);
router.delete("/:id", csrfProtection, validate(deleteChatMessageValidation), chatController.remove);

export default router;
