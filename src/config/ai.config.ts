import { env } from "./env";

export interface AiFeatureConfig {
  model: string;
  temperature: number;
  maxOutputTokens: number;
}

export interface AiRuntimeConfig extends AiFeatureConfig {
  timeoutMs: number;
  retryAttempts: number;
  circuitBreakerFailureThreshold: number;
  circuitBreakerCooldownMs: number;
  pricing: {
    inputPer1M: number;
    outputPer1M: number;
  };
}

const baseFeatureConfig: AiFeatureConfig = {
  model: env.OPENAI_MODEL,
  temperature: env.OPENAI_TEMPERATURE,
  maxOutputTokens: env.OPENAI_MAX_OUTPUT_TOKENS,
};

export const aiRuntimeConfig: AiRuntimeConfig = {
  ...baseFeatureConfig,
  timeoutMs: env.OPENAI_TIMEOUT_MS,
  retryAttempts: env.OPENAI_RETRY_ATTEMPTS,
  circuitBreakerFailureThreshold: env.OPENAI_CIRCUIT_BREAKER_FAILURE_THRESHOLD,
  circuitBreakerCooldownMs: env.OPENAI_CIRCUIT_BREAKER_COOLDOWN_MS,
  pricing: {
    inputPer1M: env.OPENAI_PRICE_INPUT_PER_1M,
    outputPer1M: env.OPENAI_PRICE_OUTPUT_PER_1M,
  },
};

export const getAiFeatureConfig = (override?: Partial<AiFeatureConfig>): AiFeatureConfig => ({
  model: override?.model ?? baseFeatureConfig.model,
  temperature: override?.temperature ?? baseFeatureConfig.temperature,
  maxOutputTokens: override?.maxOutputTokens ?? baseFeatureConfig.maxOutputTokens,
});
