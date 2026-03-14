import type { AgentContext, StructuredRequirements } from "./types";

/**
 * Requirement Agent
 * Extracts structured data from a raw user prompt.
 */
export async function requirementAgent(ctx: AgentContext): Promise<AgentContext> {
  ctx.logs.push("[RequirementAgent] Analyzing prompt...");

  const lower = ctx.prompt.toLowerCase();

  // Detect project type
  let projectType = "website";
  if (lower.includes("dashboard") || lower.includes("admin")) projectType = "dashboard";
  else if (lower.includes("portfolio") || lower.includes("resume")) projectType = "portfolio";
  else if (lower.includes("ecommerce") || lower.includes("store") || lower.includes("shop")) projectType = "ecommerce";
  else if (lower.includes("blog")) projectType = "blog";
  else if (lower.includes("landing") || lower.includes("saas")) projectType = "landing";
  else if (lower.includes("restaurant") || lower.includes("food")) projectType = "restaurant";

  // Detect pages
  const pages: string[] = ["index"];
  if (lower.includes("about")) pages.push("about");
  if (lower.includes("contact")) pages.push("contact");
  if (lower.includes("pricing")) pages.push("pricing");
  if (lower.includes("blog")) pages.push("blog");
  if (lower.includes("login") || lower.includes("auth")) pages.push("login");
  if (lower.includes("dashboard")) pages.push("dashboard");

  // Detect components
  const components: string[] = ["Navbar"];
  if (lower.includes("hero") || projectType === "landing" || projectType === "portfolio") components.push("Hero");
  if (lower.includes("footer")) components.push("Footer");
  if (lower.includes("testimonial") || lower.includes("review")) components.push("Testimonials");
  if (lower.includes("pricing") || lower.includes("plan")) components.push("Pricing");
  if (lower.includes("feature")) components.push("Features");
  if (lower.includes("contact") || lower.includes("form")) components.push("ContactForm");
  if (lower.includes("card")) components.push("Card");
  if (lower.includes("sidebar")) components.push("Sidebar");
  if (lower.includes("stats") || lower.includes("metric")) components.push("StatsGrid");
  if (lower.includes("gallery") || lower.includes("image")) components.push("Gallery");
  if (lower.includes("cta") || lower.includes("call to action")) components.push("CTA");

  // Auto-add components based on project type
  if (projectType === "landing" && !components.includes("Hero")) components.push("Hero", "Features", "CTA");
  if (projectType === "dashboard" && !components.includes("Sidebar")) components.push("Sidebar", "StatsGrid");
  if (projectType === "portfolio" && !components.includes("Hero")) components.push("Hero", "Projects", "Skills");
  if (projectType === "ecommerce") components.push("ProductCard", "Cart");
  if (projectType === "restaurant") components.push("Hero", "Menu", "Reservation");

  // Detect features
  const features: string[] = ["responsive"];
  if (lower.includes("dark")) features.push("dark-mode");
  if (lower.includes("animation") || lower.includes("animated")) features.push("animations");
  if (lower.includes("search")) features.push("search");
  if (lower.includes("filter")) features.push("filtering");
  if (lower.includes("modal") || lower.includes("popup")) features.push("modals");
  if (lower.includes("carousel") || lower.includes("slider")) features.push("carousel");

  // Detect color scheme
  let colorScheme = "blue-600 accent, slate-900 dark bg";
  if (lower.includes("green")) colorScheme = "emerald-600 accent, slate-900 dark bg";
  if (lower.includes("purple")) colorScheme = "purple-600 accent, slate-900 dark bg";
  if (lower.includes("red") || lower.includes("warm")) colorScheme = "red-600 accent, slate-900 dark bg";
  if (lower.includes("orange")) colorScheme = "orange-600 accent, slate-900 dark bg";

  // Detect layout
  let layout = "single-column";
  if (projectType === "dashboard") layout = "sidebar-main";
  if (lower.includes("grid")) layout = "grid";
  if (lower.includes("two column") || lower.includes("split")) layout = "two-column";

  const requirements: StructuredRequirements = {
    projectType,
    pages: [...new Set(pages)],
    components: [...new Set(components)],
    features: [...new Set(features)],
    colorScheme,
    typography: "Space Grotesk, sans-serif",
    layout,
  };

  ctx.requirements = requirements;
  ctx.logs.push(`[RequirementAgent] ✓ Type: ${projectType}, ${components.length} components, ${pages.length} pages`);

  return ctx;
}
