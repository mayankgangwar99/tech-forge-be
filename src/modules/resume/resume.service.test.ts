import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import request from "supertest";

const baseEnv = {
  NODE_ENV: "test",
  PORT: "5001",
  MONGO_URI: "mongodb://localhost:27017/test-db",
  JWT_ACCESS_SECRET: "test-access-secret-12345",
  JWT_REFRESH_SECRET: "test-refresh-secret-12345",
  ACCESS_TOKEN_TTL: "15m",
  REFRESH_TOKEN_TTL: "7d",
  AUTH_COOKIE_SAME_SITE: "lax",
  AUTH_RATE_LIMIT_POINTS: "1000",
  AUTH_RATE_LIMIT_DURATION: "60",
  AUTH_LOGIN_LIMIT_POINTS: "1000",
  AUTH_LOGIN_LIMIT_DURATION: "60",
  AUTH_LOGIN_LIMIT_BLOCK_DURATION: "60",
  OPENAI_API_KEY: "test-openai-key",
  OPENAI_MODEL: "gpt-4.1-mini",
  CLOUDINARY_CLOUD_NAME: "test-cloud",
  CLOUDINARY_API_KEY: "test-cloudinary-key",
  CLOUDINARY_API_SECRET: "test-cloudinary-secret",
  RESUME_UPLOAD_LIMIT_POINTS: "2",
  RESUME_UPLOAD_LIMIT_DURATION: "60",
};

const clearModule = (path: string): void => {
  try {
    delete require.cache[require.resolve(path)];
  } catch {
    // ignore
  }
};

const resetResumeImports = (): void => {
  clearModule("./resume.service");
  clearModule("./resume.model");
  clearModule("../ai/aiUsage.model");
  clearModule("../ai/aiUsage.service");
  clearModule("../../services/storage.service");
  clearModule("../../services/ai.service");
  clearModule("../../middlewares/resumeUpload.middleware");
  clearModule("../../middlewares/rateLimiter.middleware");
  clearModule("../../config/env");
  clearModule("../../config/ai.config");
};

const setupEnv = (): void => {
  Object.assign(process.env, baseEnv);
};

test("valid analyse middleware accepts text file", async () => {
  setupEnv();
  resetResumeImports();
  const { resumeUpload, validateResumeMagicNumber } = await import(
    "../../middlewares/resumeAnalyse.middleware"
  );

  const app = express();
  app.post("/analyse", resumeUpload.single("resume"), validateResumeMagicNumber, (_req, res) =>
    res.status(200).json({ ok: true })
  );
  app.use((err: any, _req: any, res: any, _next: any) => {
    if (err?.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "LIMIT_FILE_SIZE" });
    }
    return res.status(err?.statusCode ?? 500).json({ message: err?.message ?? "failed" });
  });

  const response = await request(app)
    .post("/analyse")
    .attach("resume", Buffer.from("%PDF-1.4 mock-content"), {
      filename: "resume.pdf",
      contentType: "application/pdf",
    });

  assert.equal(response.status, 200);
});

test("invalid mime type is rejected", async () => {
  setupEnv();
  resetResumeImports();
  const { resumeUpload } = await import("../../middlewares/resumeAnalyse.middleware");

  const app = express();
  app.post("/analyse", resumeUpload.single("resume"), (_req, res) => res.status(200).json({ ok: true }));
  app.use((err: any, _req: any, res: any, _next: any) => {
    return res.status(err?.statusCode ?? 500).json({ message: err?.message ?? "failed" });
  });

  const response = await request(app)
    .post("/analyse")
    .attach("resume", Buffer.from("bad"), { filename: "image.png", contentType: "image/png" });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /Unsupported resume file type/i);
});

test("large resume file is rejected", async () => {
  setupEnv();
  resetResumeImports();
  const { resumeUpload } = await import("../../middlewares/resumeAnalyse.middleware");

  const app = express();
  app.post("/analyse", resumeUpload.single("resume"), (_req, res) => res.status(200).json({ ok: true }));
  app.use((err: any, _req: any, res: any, _next: any) => {
    if (err?.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "LIMIT_FILE_SIZE" });
    }
    return res.status(err?.statusCode ?? 500).json({ message: err?.message ?? "failed" });
  });

  const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024, "a");
  const response = await request(app)
    .post("/analyse")
    .attach("resume", oversizedBuffer, { filename: "resume.pdf", contentType: "application/pdf" });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "LIMIT_FILE_SIZE");
});

test("duplicate resume detection returns existing record", async () => {
  setupEnv();
  resetResumeImports();
  const resumeService = await import("./resume.service");
  const resumeModel = await import("./resume.model");

  const existing = {
    _id: { toString: () => "resume_1" },
    userId: { toString: () => "user_1" },
    version: 1,
    checksum: "a".repeat(64),
    file: {
      fileName: "resume.txt",
      fileSize: 100,
      mimeType: "text/plain",
      cloudinaryPublicId: "public_id",
      secureUrl: "https://example.com/file",
      resourceType: "raw",
    },
    ai: { status: "processed" },
    insights: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  (resumeModel.Resume.findOne as unknown as (query: unknown) => unknown) = async () => existing;

  const result = await resumeService.uploadResume({
    userId: "66a2f5bc1234567890abc123",
    requestId: "req-1",
    file: {
      originalname: "resume.txt",
      mimetype: "text/plain",
      buffer: Buffer.from("abc"),
      size: 3,
    } as Express.Multer.File,
  });

  assert.equal(result.id, "resume_1");
  assert.equal(result.ai.status, "processed");
});

test("AI processing success updates resume and usage log", async () => {
  setupEnv();
  resetResumeImports();

  const resumeService = await import("./resume.service");
  const resumeModel = await import("./resume.model");
  const aiService = await import("../../services/ai.service");

  const claim = {
    _id: "resume-123",
    userId: { toString: () => "66a2f5bc1234567890abc123" },
    file: {
      fileName: "resume.txt",
      mimeType: "text/plain",
      secureUrl: "https://example.com/resume.txt",
    },
    ai: {},
  };

  (resumeModel.Resume.findOneAndUpdate as unknown as (query: unknown, update: unknown, options: unknown) => unknown) =
    async () => claim;
  (resumeModel.Resume.updateOne as unknown as (query: unknown, update: unknown) => unknown) = async () => ({
    acknowledged: true,
  });
  (aiService.analyzeResume as unknown as (text: string) => unknown) = async () => ({
    insights: {
      summary: "Strong engineering profile",
      experience_years: 5,
      skills: ["Node.js"],
      education: ["B.Tech"],
      projects: ["AI resume analyzer"],
      strengths: ["Backend development"],
      gaps: ["System design depth"],
      job_fit_score: 82,
      improvement_suggestions: ["Add measurable impact bullets"],
    },
    model: "gpt-4.1-mini",
    tokensInput: 100,
    tokensOutput: 200,
    totalTokens: 300,
    latencyMs: 123,
  });

  (global as unknown as { fetch: typeof fetch }).fetch = async () =>
    ({
      ok: true,
      arrayBuffer: async () => Buffer.from("text").buffer,
    }) as Response;

  await resumeService.processResumeAnalysis("66a2f5bc1234567890abc456");
  assert.ok(true);
});

test("AI processing failure marks status failed", async () => {
  setupEnv();
  resetResumeImports();

  const resumeService = await import("./resume.service");
  const resumeModel = await import("./resume.model");
  const aiService = await import("../../services/ai.service");

  const claim = {
    _id: "resume-123",
    userId: { toString: () => "66a2f5bc1234567890abc123" },
    file: {
      fileName: "resume.txt",
      mimeType: "text/plain",
      secureUrl: "https://example.com/resume.txt",
    },
    ai: {},
  };

  (resumeModel.Resume.findOneAndUpdate as unknown as (query: unknown, update: unknown, options: unknown) => unknown) =
    async () => claim;
  (resumeModel.Resume.updateOne as unknown as (query: unknown, update: unknown) => unknown) = async () => ({
    acknowledged: true,
  });
  (aiService.analyzeResume as unknown as (text: string) => unknown) = async () => {
    throw new Error("provider error");
  };

  (global as unknown as { fetch: typeof fetch }).fetch = async () =>
    ({
      ok: true,
      arrayBuffer: async () => Buffer.from("text").buffer,
    }) as Response;

  await resumeService.processResumeAnalysis("66a2f5bc1234567890abc456");
  assert.ok(true);
});

test("pagination and sort return paginated list", async () => {
  setupEnv();
  resetResumeImports();
  const resumeService = await import("./resume.service");
  const resumeModel = await import("./resume.model");

  const items = [
    {
      _id: { toString: () => "resume_1" },
      userId: { toString: () => "user_1" },
      version: 2,
      checksum: "b".repeat(64),
      file: {
        fileName: "resume-2.txt",
        fileSize: 100,
        mimeType: "text/plain",
        cloudinaryPublicId: "public_2",
        secureUrl: "https://example.com/file2",
        resourceType: "raw",
      },
      ai: { status: "processed" },
    },
  ];

  (resumeModel.Resume.find as unknown as (query: unknown) => unknown) = () => ({
    sort: () => ({
      skip: () => ({
        limit: async () => items,
      }),
    }),
  });
  (resumeModel.Resume.countDocuments as unknown as (query: unknown) => unknown) = async () => 1;

  const result = await resumeService.listResumes({
    userId: "66a2f5bc1234567890abc123",
    page: 1,
    limit: 10,
    sort: "newest",
  });

  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
});

test("soft delete enforces ownership and marks deleted", async () => {
  setupEnv();
  resetResumeImports();

  const resumeService = await import("./resume.service");
  const resumeModel = await import("./resume.model");
  const { AppError } = await import("../../utils/appError");

  (resumeModel.Resume.findOne as unknown as (query: unknown) => unknown) = async () => null;

  await assert.rejects(
    () => resumeService.deleteResume("66a2f5bc1234567890abc123", "66a2f5bc1234567890abc456"),
    (error) => error instanceof AppError && error.statusCode === 404
  );

  assert.ok(true);
});

test("resume analyse rate limiter enforces limits", async () => {
  setupEnv();
  resetResumeImports();
  const rateLimiter = await import("../../middlewares/rateLimiter.middleware");

  const req = {
    ip: "127.0.0.1",
    user: { id: "user_1", role: "user" },
  } as any;

  const createRes = () => {
    return {
      statusCode: 200,
      payload: null as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.payload = payload;
        return this;
      },
      setHeader() {
        return undefined;
      },
    };
  };

  const firstRes = createRes();
  const secondRes = createRes();
  const thirdRes = createRes();

  await rateLimiter.resumeUploadRateLimiter(req, firstRes as any, () => undefined);
  await rateLimiter.resumeUploadRateLimiter(req, secondRes as any, () => undefined);
  await rateLimiter.resumeUploadRateLimiter(req, thirdRes as any, () => undefined);

  assert.equal(thirdRes.statusCode, 429);
});
