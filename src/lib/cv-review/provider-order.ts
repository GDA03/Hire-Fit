export type ModelProvider = "gemini" | "groq" | "openrouter";

export function resolveModelProviders(configured: string[], translation: boolean) {
  const providers = configured.length > 0 ? configured : ["gemini", "groq", "openrouter"];

  return providers.filter((provider): provider is ModelProvider =>
    provider === "gemini" || provider === "openrouter" || (provider === "groq" && !translation),
  );
}
