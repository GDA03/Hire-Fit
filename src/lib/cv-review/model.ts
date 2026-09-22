import { GoogleGenerativeAI } from "@google/generative-ai";
import { readEnv } from "@/lib/env";
import { extractJsonObject } from "./validation";
import { resolveModelProviders } from "./provider-order";

const defaultGeminiModel = "gemini-2.5-flash-lite";
const defaultGroqModel = "openai/gpt-oss-120b";
const defaultOpenRouterModel = "openrouter/free";
const groqEndpoint = "https://api.groq.com/openai/v1/chat/completions";
const openRouterEndpoint = "https://openrouter.ai/api/v1/chat/completions";

export type GenerateJsonOptions = {
  prompt: string;
  action?: "analyze" | "translate";
  geminiModelEnv?: string;
  groqModelsEnv?: string;
  openRouterModelsEnv?: string;
  providerOrderEnv?: string;
  validateJson?: (value: unknown) => unknown;
};

type OpenRouterChoice = {
  message?: {
    content?: string | Array<{ text?: string; type?: string }>;
  };
};

type OpenRouterResponse = {
  choices?: OpenRouterChoice[];
  error?: {
    message?: string;
    code?: string | number;
  };
};

export function isAnalyzeRequestError(error: unknown) {
  if (!(error instanceof Error)) return false;
  if (
    error.message.startsWith("Invalid CV review result") ||
    error.message.includes("Model response") ||
    error.message.startsWith("All model providers failed")
  ) {
    return false;
  }

  return (
    error.message.includes("must") ||
    error.message.includes("too long") ||
    error.message.includes("not supported") ||
    error.message.includes("at least")
  );
}

export function publicModelErrorMessage(action: "analyze" | "translate") {
  return action === "analyze"
    ? "CV analysis is temporarily unavailable. Please try again later."
    : "Review translation is temporarily unavailable. Please try again later.";
}

export async function generateJsonText({
  prompt,
  action = "analyze",
  geminiModelEnv,
  groqModelsEnv,
  openRouterModelsEnv,
  providerOrderEnv,
  validateJson,
}: GenerateJsonOptions) {
  const errors: unknown[] = [];
  const providers = readModelProviders(providerOrderEnv);

  for (const provider of providers) {
    const startedAt = Date.now();

    try {
      const text =
        provider === "gemini"
          ? await withTimeout(generateWithGemini(prompt, geminiModelEnv), readProviderTimeout("GEMINI_TIMEOUT_MS"), provider)
          : provider === "groq"
            ? await withTimeout(generateWithGroq(prompt, groqModelsEnv), readProviderTimeout("GROQ_TIMEOUT_MS"), provider)
            : await withTimeout(generateWithOpenRouter(prompt, openRouterModelsEnv), readProviderTimeout("OPENROUTER_TIMEOUT_MS"), provider);
      const parsed = extractJsonObject(text);
      if (validateJson) {
        validateJson(parsed);
      }
      console.info(`${action} ${provider} model succeeded in ${Date.now() - startedAt}ms`);
      return text;
    } catch (error) {
      errors.push(error);
      console.error(`${action} ${provider} model failed after ${Date.now() - startedAt}ms`, summarizeModelError(error));
    }
  }

  throw new Error(`All model providers failed: ${errors.map(summarizeModelError).join("; ")}`);
}

export function readModelProviders(envName = "AI_PROVIDER_ORDER") {
  const configured = readCsvEnv(envName);
  const fallback = envName === "AI_TRANSLATION_PROVIDER_ORDER" ? readCsvEnv("AI_PROVIDER_ORDER") : [];
  return resolveModelProviders(configured.length > 0 ? configured : fallback, envName === "AI_TRANSLATION_PROVIDER_ORDER");
}

async function generateWithGemini(prompt: string, modelEnvName = "GEMINI_MODEL") {
  const apiKey = readEnv("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY.");

  const errors: unknown[] = [];
  const genAI = new GoogleGenerativeAI(apiKey);
  const models = readGeminiModels(modelEnvName);

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      extractJsonObject(text);
      return text;
    } catch (error) {
      errors.push(error);
      console.error(`gemini model ${modelName} failed`, summarizeModelError(error));
    }
  }

  throw new Error(`Gemini models failed: ${errors.map(summarizeModelError).join("; ")}`);
}

async function generateWithGroq(prompt: string, modelsEnvName = "GROQ_MODELS") {
  const apiKey = readEnv("GROQ_API_KEY");
  if (!apiKey) throw new Error("Missing GROQ_API_KEY.");

  const errors: unknown[] = [];
  const models = readGroqModels(modelsEnvName);

  for (const model of models) {
    try {
      const response = await fetch(groqEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: buildOpenRouterMessages(prompt),
          max_tokens: readMaxTokens(),
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
      });
      const data = (await response.json().catch(() => ({}))) as OpenRouterResponse;
      if (!response.ok) {
        throw new Error(`Groq request failed with ${response.status}: ${data.error?.message ?? response.statusText}`);
      }

      const content = data.choices?.[0]?.message?.content;
      const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((part) => part.text ?? "").join("") : "";
      if (!text) throw new Error("Groq response did not contain message content.");
      extractJsonObject(text);
      return text;
    } catch (error) {
      errors.push(error);
      console.error(`groq model ${model} failed`, summarizeModelError(error));
    }
  }

  throw new Error(`Groq models failed: ${errors.map(summarizeModelError).join("; ")}`);
}

async function generateWithOpenRouter(prompt: string, modelsEnvName = "OPENROUTER_MODELS") {
  const apiKey = readEnv("OPENROUTER_API_KEY");
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY.");

  const errors: unknown[] = [];
  const models = readOpenRouterModels(modelsEnvName);

  for (const model of models) {
    try {
      const text = await generateWithOpenRouterModel(prompt, apiKey, model, true);
      extractJsonObject(text);
      return text;
    } catch (error) {
      errors.push(error);
      console.error(`openrouter model ${model} json-mode failed`, summarizeModelError(error));
    }

    try {
      const text = await generateWithOpenRouterModel(prompt, apiKey, model, false);
      extractJsonObject(text);
      return text;
    } catch (error) {
      errors.push(error);
      console.error(`openrouter model ${model} prompt-json failed`, summarizeModelError(error));
    }
  }

  throw new Error(`OpenRouter models failed: ${errors.map(summarizeModelError).join("; ")}`);
}


async function generateWithOpenRouterModel(prompt: string, apiKey: string, model: string, useJsonMode: boolean) {
  const appUrl = readEnv("NEXT_PUBLIC_APP_URL");
  const body = {
    model,
    messages: buildOpenRouterMessages(prompt),
    max_tokens: readMaxTokens(),
    temperature: 0.1,
    ...(useJsonMode
      ? {
          provider: { require_parameters: true },
          response_format: { type: "json_object" },
        }
      : {}),
  };
  const response = await fetch(openRouterEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(appUrl ? { "HTTP-Referer": appUrl } : {}),
      "X-Title": "HireFit",
      "X-OpenRouter-Title": "HireFit",
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => ({}))) as OpenRouterResponse;
  if (!response.ok) {
    throw new Error(`OpenRouter request failed with ${response.status}: ${data.error?.message ?? response.statusText}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part.text ?? "").join("");

  throw new Error("OpenRouter response did not contain message content.");
}

function buildOpenRouterMessages(prompt: string) {
  return [
    {
      role: "system",
      content: "Return one complete valid JSON object only. No markdown. No code fences. Start with { and end with }. Do not truncate output.",
    },
    {
      role: "user",
      content: prompt,
    },
  ];
}

function readCsvEnv(name: string) {
  const value = readEnv(name);
  if (!value) return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readGeminiModels(modelEnvName: string) {
  const configured = readCsvEnv(modelEnvName);
  const fallback = modelEnvName === "GEMINI_TRANSLATION_MODEL" ? readCsvEnv("GEMINI_MODEL") : [];
  const models = configured.length > 0 ? configured : fallback;

  return models.length > 0 ? models : [defaultGeminiModel];
}

function readOpenRouterModels(modelsEnvName: string) {
  const configured = readCsvEnv(modelsEnvName);
  const fallback = modelsEnvName === "OPENROUTER_TRANSLATION_MODELS" ? readCsvEnv("OPENROUTER_MODELS") : [];
  const models = configured.length > 0 ? configured : fallback;

  return models.length > 0 ? models : [defaultOpenRouterModel];
}
function readGroqModels(modelsEnvName: string) {
  const configured = readCsvEnv(modelsEnvName);
  return configured.length > 0 ? configured : [defaultGroqModel];
}

function readMaxTokens() {
  const value = Number(readEnv("OPENROUTER_MAX_TOKENS"));
  return Number.isFinite(value) && value > 0 ? value : 16_000;
}

function readProviderTimeout(name: string) {
  const value = Number(readEnv(name));
  return Number.isFinite(value) && value > 0 ? value : 15_000;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, provider: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${provider} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function summarizeModelError(error: unknown) {
  if (!(error instanceof Error)) return "Unknown model error";

  return error.message;
}
