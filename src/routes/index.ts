import { Router } from "express";
import authRouter from "../modules/auth/auth.routes";
import chatRouter from "../modules/chat/chat.routes";
import planRouter from "../modules/plan/plan.routes";
import weeklyLearningRouter from "../modules/weekly-learning/weekly-learning.routes";
import resumeRouter from "../modules/resume/resume.routes";

const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/resume", resumeRouter);
apiRouter.use("/plan", planRouter);
apiRouter.use("/weekly-learning", weeklyLearningRouter);
apiRouter.use("/chat", chatRouter);

export default apiRouter;
