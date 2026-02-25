import { NextFunction, Request, Response } from "express";
import { RateLimiterMemory, RateLimiterMongo } from "rate-limiter-flexible";
import mongoose from "mongoose";
import { env } from "../config/env";
import { sendError } from "../utils/apiResponse";
import logger from "../config/logger";

interface RateLimiterOptions {
  keyPrefix: string;
  points: number;
  duration: number;
  blockDuration?: number;
}

export const createRateLimiter = ({
  keyPrefix,
  points,
  duration,
  blockDuration,
}: RateLimiterOptions) => {
  const limiter = new RateLimiterMemory({
    keyPrefix,
    points,
    duration,
    blockDuration,
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await limiter.consume(req.ip || "unknown");
      next();
    } catch {
      return sendError(res, 429, "Too many requests");
    }
  };
};

interface LoginAttemptState {
  failures: number;
  updatedAt: number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, LoginAttemptState>();
const loginAttemptTtlMs = env.AUTH_LOGIN_ATTEMPT_TTL_SECONDS * 1000;

const cleanupExpiredLoginAttempts = (): void => {
  const now = Date.now();

  for (const [key, state] of loginAttempts.entries()) {
    if (state.lockedUntil && state.lockedUntil > now) {
      continue;
    }

    if (now - state.updatedAt > loginAttemptTtlMs) {
      loginAttempts.delete(key);
    }
  }
};

const cleanupInterval = setInterval(cleanupExpiredLoginAttempts, Math.min(loginAttemptTtlMs, 60 * 1000));
cleanupInterval.unref();

const normalizeEmail = (value: unknown): string => {
  if (typeof value !== "string") {
    return "unknown";
  }

  const normalized = value.trim().toLowerCase();
  return normalized || "unknown";
};

const buildLoginKey = (req: Request): string => {
  const email = normalizeEmail(req.body?.email);
  const ip = req.ip || "unknown";
  return `${email}:${ip}`;
};

const isLoginFailureStatus = (statusCode: number): boolean => {
  return statusCode === 401 || statusCode === 403 || statusCode === 429;
};

const resetAttemptState = (key: string): void => {
  loginAttempts.delete(key);
};

const scheduleAttemptUpdate = (req: Request, res: Response): void => {
  cleanupExpiredLoginAttempts();
  const key = buildLoginKey(req);

  res.on("finish", () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      resetAttemptState(key);
      return;
    }

    if (!isLoginFailureStatus(res.statusCode)) {
      return;
    }

    const existing = loginAttempts.get(key);
    const failures = (existing?.failures ?? 0) + 1;
    const nextState: LoginAttemptState = {
      failures,
      updatedAt: Date.now(),
    };

    if (failures >= env.AUTH_LOGIN_LOCK_AFTER_FAILURES) {
      nextState.lockedUntil = Date.now() + env.AUTH_LOGIN_LOCK_FOR_SECONDS * 1000;
    }

    loginAttempts.set(key, nextState);
  });
};

const delayForMs = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const authRateLimiter = createRateLimiter({
  keyPrefix: "auth_general",
  points: env.AUTH_RATE_LIMIT_POINTS,
  duration: env.AUTH_RATE_LIMIT_DURATION,
});

export const authLoginRateLimiter = createRateLimiter({
  keyPrefix: "auth_login",
  points: env.AUTH_LOGIN_LIMIT_POINTS,
  duration: env.AUTH_LOGIN_LIMIT_DURATION,
  blockDuration: env.AUTH_LOGIN_LIMIT_BLOCK_DURATION,
});

let resumeUploadLimiter: RateLimiterMemory | RateLimiterMongo | null = null;

const getResumeUploadLimiter = (): RateLimiterMemory | RateLimiterMongo => {
  if (resumeUploadLimiter) {
    return resumeUploadLimiter;
  }

  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    resumeUploadLimiter = new RateLimiterMongo({
      storeClient: mongoose.connection.db,
      keyPrefix: "resume_upload",
      points: env.RESUME_UPLOAD_LIMIT_POINTS,
      duration: env.RESUME_UPLOAD_LIMIT_DURATION,
      insuranceLimiter: new RateLimiterMemory({
        points: env.RESUME_UPLOAD_LIMIT_POINTS,
        duration: env.RESUME_UPLOAD_LIMIT_DURATION,
      }),
    });
    return resumeUploadLimiter;
  }

  resumeUploadLimiter = new RateLimiterMemory({
    keyPrefix: "resume_upload_fallback",
    points: env.RESUME_UPLOAD_LIMIT_POINTS,
    duration: env.RESUME_UPLOAD_LIMIT_DURATION,
  });
  return resumeUploadLimiter;
};

const getResumeUploadRateLimitKey = (req: Request): string => {
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }

  return `ip:${req.ip || "unknown"}`;
};

export const resumeUploadRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getResumeUploadLimiter().consume(getResumeUploadRateLimitKey(req));
    next();
  } catch {
    return sendError(
      res,
      429,
      "Resume analyse rate limit exceeded. Please retry after a minute.",
      [{ message: "resume_analyse_rate_limited" }]
    );
  }
};

export const trackLoginAttempt = async (req: Request, res: Response, next: NextFunction) => {
  scheduleAttemptUpdate(req, res);
  next();
};

export const authLoginGuard = async (req: Request, res: Response, next: NextFunction) => {
  cleanupExpiredLoginAttempts();
  const key = buildLoginKey(req);
  const attemptState = loginAttempts.get(key);

  if (attemptState?.lockedUntil && attemptState.lockedUntil > Date.now()) {
    const retryAfterSeconds = Math.ceil((attemptState.lockedUntil - Date.now()) / 1000);

    logger.warn("auth_login_temporarily_locked", {
      requestId: req.requestId,
      key,
      retryAfterSeconds,
    });

    res.setHeader("Retry-After", retryAfterSeconds.toString());
    return sendError(res, 429, "Too many failed login attempts. Try again later.");
  }

  if (attemptState?.lockedUntil && attemptState.lockedUntil <= Date.now()) {
    loginAttempts.delete(key);
  }

  const failures = attemptState?.failures ?? 0;

  if (failures >= env.AUTH_LOGIN_DELAY_AFTER_FAILURES) {
    const multiplier = failures - env.AUTH_LOGIN_DELAY_AFTER_FAILURES + 1;
    const delayMs = multiplier * env.AUTH_LOGIN_DELAY_MS;

    await delayForMs(delayMs);
  }

  next();
};
