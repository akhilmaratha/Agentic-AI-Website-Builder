import { agencyPrompt } from "./prompts/templates/agencyPrompt";
import { blogPrompt } from "./prompts/templates/blogPrompt";
import { ecommercePrompt } from "./prompts/templates/ecommercePrompt";
import { portfolioPrompt } from "./prompts/templates/portfolioPrompt";
import { saasPrompt } from "./prompts/templates/saasPrompt";

export const PROMPT_MAP: Record<string, string> = {
  "Create portfolio website": portfolioPrompt,
  "Create SaaS landing page": saasPrompt,
  "Generate blog homepage": blogPrompt,
  "Create ecommerce store UI": ecommercePrompt,
  "Build agency website": agencyPrompt,
};

export function getMappedPrompt(input: string): string {
  const exact = PROMPT_MAP[input];
  if (exact) return exact;

  const found = Object.entries(PROMPT_MAP).find(
    ([key]) => key.toLowerCase() === input.toLowerCase()
  );
  return found ? found[1] : input;
}
