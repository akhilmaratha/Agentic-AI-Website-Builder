import { PROMPT_MAP } from "@/ai-engine/promptMap";
import { codeGeneratorPrompt } from "@/ai-engine/prompts/generator/codeGeneratorPrompt";
import { layoutPlannerPrompt } from "@/ai-engine/prompts/planner/layoutPlannerPrompt";

function normalizePrompt(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

function fallbackExpandPrompt(userPrompt: string): string {
  const p = userPrompt.trim();
  if (!p) return "Create a modern responsive website.";

  if (p.toLowerCase().includes("portfolio")) {
    return `Create a developer portfolio website.

Sections:
- Navbar
- Hero section with developer introduction
- Projects showcase
- Skills section
- Testimonials
- Contact form
- Footer

Design style:
- minimal
- modern
- developer focused

Use Tailwind CSS, responsive layouts, and Unsplash images for profile/projects.`;
  }

  if (p.toLowerCase().includes("blog")) {
    return `Generate a modern blog homepage.

Sections:
- Navbar
- Hero banner
- Featured posts
- Latest articles
- Categories
- Newsletter signup
- Footer

Design style:
- editorial
- clean typography
- responsive card grid

Use Tailwind CSS and Unsplash images.`;
  }

  if (p.toLowerCase().includes("saas") || p.toLowerCase().includes("landing")) {
    return `Generate a modern SaaS landing page.

Sections:
- Navbar
- Hero with CTA
- Features
- Testimonials
- Pricing
- FAQ
- Footer

Design style:
- startup aesthetic
- gradient accents
- rounded cards
- soft shadows

Use Tailwind CSS and Unsplash images.`;
  }

  return `Create a modern website based on this request: ${p}

Use Next.js App Router, TypeScript, Tailwind CSS, modular components, semantic HTML, responsive design, rounded cards, soft shadows, and gradient accents.`;
}

export function shouldExpandPrompt(messages: { role: string; content: string }[]): boolean {
  const userCount = messages.filter((m) => m.role === "user").length;
  // Treat first user prompt as initial website creation request.
  return userCount <= 1;
}

export function buildExpandedCreationPrompt(userPrompt: string): string {
  const normalized = normalizePrompt(userPrompt);
  const mappedEntry = Object.entries(PROMPT_MAP).find(([key]) => key.toLowerCase() === normalized);
  const mapped = mappedEntry ? mappedEntry[1] : fallbackExpandPrompt(userPrompt);

  // NOTE: systemPrompt is already sent as the "system" role message in callAIModel.
  // Do NOT include it here — that would send it twice and confuse the AI.
  // Only include planning guidance and code quality rules as supplementary context.
  return `${layoutPlannerPrompt}\n\n${codeGeneratorPrompt}\n\nUser request:\n${userPrompt.trim()}\n\nDetailed build brief:\n${mapped}`;
}
