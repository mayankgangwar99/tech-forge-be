import { Router } from "express";
import authRouter from "../modules/auth/auth.routes";
import resumeRouter from "../modules/resume/resume.routes";

const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/resume", resumeRouter);

export default apiRouter;
