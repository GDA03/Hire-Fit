import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { generateJsonText, isAnalyzeRequestError } from "./model";
import { resolveModelProviders } from "./provider-order";
import { validateCVReviewResult } from "./validation";
import { makeValidReviewResult } from "./validation.test";

let mockGeminiResponseText = () => JSON.stringify({ overallScore: 80, summary: "Incomplete" });

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContent: async () => ({
            response: {
              text: () => mockGeminiResponseText(),
            },
          }),
        };
      }
    },
  };
});
describe("resolveModelProviders", () => {
  test("defaults analysis to Gemini, Groq, then OpenRouter", () => {
    expect(resolveModelProviders([], false)).toEqual(["gemini", "groq", "openrouter"]);
  });

  test("keeps Groq out of translation fallback providers", () => {
    expect(resolveModelProviders([], true)).toEqual(["gemini", "openrouter"]);
  });

  test("preserves configured analysis order", () => {
    expect(resolveModelProviders(["gemini", "groq", "openrouter"], false)).toEqual(["gemini", "groq", "openrouter"]);
  });
});

describe("isAnalyzeRequestError", () => {
  test("identifies request validation errors as client 400 errors", () => {
    expect(isAnalyzeRequestError(new Error("CV text must be at least 50 characters."))).toBe(true);
    expect(isAnalyzeRequestError(new Error("CV text is too long. Please keep it under 60,000 characters."))).toBe(true);
    expect(isAnalyzeRequestError(new Error("Review purpose is not supported."))).toBe(true);
  });

  test("keeps model schema validation and provider errors out of request 400s", () => {
    expect(isAnalyzeRequestError(new Error("Invalid CV review result: overallScore must be an integer between 0 and 100."))).toBe(false);
    expect(isAnalyzeRequestError(new Error("Model response did not contain a JSON object."))).toBe(false);
    expect(isAnalyzeRequestError(new Error("All model providers failed: Gemini timed out; Groq 500"))).toBe(false);
  });
});

describe("generateJsonText fallback", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      GEMINI_API_KEY: "fake-gemini-key",
      GROQ_API_KEY: "fake-groq-key",
      AI_PROVIDER_ORDER: "gemini,groq",
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  test("proceeds to next provider when first provider produces schema-invalid JSON", async () => {
    mockGeminiResponseText = () => JSON.stringify({ overallScore: 80, summary: "Incomplete" });
    // Groq mock returns valid CVReviewResult JSON
    const validResult = makeValidReviewResult(false);
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("groq.com")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify(validResult),
                },
              },
            ],
          }),
        };
      }
      return { ok: false, status: 500, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);

    const text = await generateJsonText({
      prompt: "Review CV",
      action: "analyze",
      validateJson: (val) => validateCVReviewResult(val, { hasJobTarget: false }),
    });

    const parsed = JSON.parse(text);
    expect(parsed.overallScore).toBe(80);
    expect(parsed.sections.workExperience).toBeDefined();
    expect(fetchMock).toHaveBeenCalled();
  });

  test("proceeds to next provider when first provider throws transient error", async () => {
    mockGeminiResponseText = () => {
      throw new Error("Gemini 503 Service Unavailable");
    };

    const validResult = makeValidReviewResult(false);
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("groq.com")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify(validResult),
                },
              },
            ],
          }),
        };
      }
      return { ok: false, status: 500, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);

    const text = await generateJsonText({
      prompt: "Review CV",
      action: "analyze",
      validateJson: (val) => validateCVReviewResult(val, { hasJobTarget: false }),
    });

    const parsed = JSON.parse(text);
    expect(parsed.overallScore).toBe(80);
    expect(fetchMock).toHaveBeenCalled();
  });
});
