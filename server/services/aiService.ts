import { runAgentPipeline, type OrchestratorResult } from "../agents/orchestrator";

/**
 * AI Service
 * Wraps the multi-agent pipeline with LLM integration.
 */
export class AIService {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY ?? "";
    this.baseURL = process.env.AI_BASE_URL ?? "https://openrouter.ai/api/v1";
    this.model = process.env.AI_MODEL ?? "deepseek/deepseek-chat";
  }

  /**
   * Run the full multi-agent pipeline on a prompt.
   */
  async generateFromPrompt(
    prompt: string,
    options?: { skipDeployment?: boolean }
  ): Promise<OrchestratorResult> {
    return runAgentPipeline(prompt, options);
  }

  /**
   * Enhance a single component via LLM (optional).
   */
  async enhanceWithLLM(code: string, instructions: string): Promise<string> {
    if (!this.apiKey) return code; // no-op if no key

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      };

      if (this.baseURL.includes("openrouter.ai")) {
        headers["HTTP-Referer"] = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
        headers["X-Title"] = "Agentic AI Website Builder";
      }

      const res = await fetch(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content:
                "You are a React/Tailwind expert. Modify the component code according to instructions. Return ONLY the modified code, no explanations.",
            },
            {
              role: "user",
              content: `Instructions: ${instructions}\n\nCode:\n${code}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 4096,
        }),
      });

      if (!res.ok) return code;

      const data = await res.json();
      const result = data?.choices?.[0]?.message?.content ?? code;

      // Strip code fences
      return result
        .replace(/^```(?:tsx|jsx|typescript|javascript)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();
    } catch {
      return code;
    }
  }
}

export const aiService = new AIService();
