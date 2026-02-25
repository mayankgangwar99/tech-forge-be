import OpenAI from "openai";
import logger from "../config/logger";
import { aiRuntimeConfig, getAiFeatureConfig } from "../config/ai.config";
import { env } from "../config/env";
import { AppError } from "../utils/appError";

interface CircuitBreakerState {
  consecutiveFailures: number;
  openedUntil: number | null;
}

export interface OpenAiUsageMetrics {
  tokensInput: number;
  tokensOutput: number;
  totalTokens: number;
  latencyMs: number;
}

export interface StructuredOutputResult<T> extends OpenAiUsageMetrics {
  data: T;
  model: string;
}

interface StructuredOutputOptions {
  feature: string;
  schemaName: string;
  schema: Record<string, unknown>;
  modelOverride?: string;
  temperatureOverride?: number;
  maxOutputTokensOverride?: number;
}

const client = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const circuitBreakerState: CircuitBreakerState = {
  consecutiveFailures: 0,
  openedUntil: null,
};

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isCircuitOpen = (): boolean => {
  const openedUntil = circuitBreakerState.openedUntil;
  if (!openedUntil) {
    return false;
  }

  if (Date.now() >= openedUntil) {
    circuitBreakerState.openedUntil = null;
    circuitBreakerState.consecutiveFailures = 0;
    return false;
  }

  return true;
};

const registerFailure = (): void => {
  circuitBreakerState.consecutiveFailures += 1;

  if (circuitBreakerState.consecutiveFailures >= aiRuntimeConfig.circuitBreakerFailureThreshold) {
    circuitBreakerState.openedUntil = Date.now() + aiRuntimeConfig.circuitBreakerCooldownMs;
  }
};

const registerSuccess = (): void => {
  circuitBreakerState.consecutiveFailures = 0;
  circuitBreakerState.openedUntil = null;
};

const withTimeout = async <T>(callback: (signal: AbortSignal) => Promise<T>): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), aiRuntimeConfig.timeoutMs);

  try {
    return await callback(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
};

const parseStructuredOutput = <T>(output: string): T => {
  try {
    return JSON.parse(output) as T;
  } catch {
    throw new AppError("Failed to parse structured AI output", 502);
  }
};

export const requestStructuredOutput = async <T>(
  prompt: string,
  options: StructuredOutputOptions
): Promise<StructuredOutputResult<T>> => {
  if (isCircuitOpen()) {
    throw new AppError("AI service is temporarily unavailable", 503);
  }

  const featureConfig = getAiFeatureConfig({
    model: options.modelOverride,
    temperature: options.temperatureOverride,
    maxOutputTokens: options.maxOutputTokensOverride,
  });

  let attempt = 0;
  let lastError: unknown;

  while (attempt < aiRuntimeConfig.retryAttempts) {
    attempt += 1;
    const startedAt = Date.now();

    try {
      const response = await withTimeout((signal) =>
        client.responses.create(
          {
            model: featureConfig.model,
            temperature: featureConfig.temperature,
            max_output_tokens: featureConfig.maxOutputTokens,
            input: [
              {
                role: "system",
                content:
                  "You are an expert resume intelligence engine. Respond with valid JSON only, matching the schema exactly.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            text: {
              format: {
                type: "json_schema",
                name: options.schemaName,
                strict: true,
                schema: options.schema,
              },
            },
          },
          { signal }
        )
      );

      const latencyMs = Date.now() - startedAt;
      registerSuccess();

      const usage = response.usage;
      const data = parseStructuredOutput<T>(response.output_text);

      return {
        data,
        model: featureConfig.model,
        tokensInput: usage?.input_tokens ?? 0,
        tokensOutput: usage?.output_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
        latencyMs,
      };
    } catch (error) {
      lastError = error;
      registerFailure();

      logger.warn("openai_request_failed", {
        feature: options.feature,
        attempt,
        model: featureConfig.model,
        message: error instanceof Error ? error.message : "Unknown OpenAI error",
      });

      if (attempt < aiRuntimeConfig.retryAttempts) {
        const backoffMs = 200 * 2 ** (attempt - 1);
        await sleep(backoffMs);
      }
    }
  }

  throw new AppError("AI service request failed", 502, {
    reason: lastError instanceof Error ? lastError.message : "Unknown provider error",
  });
};
