import type { AgentContext, ComponentStructure, PageLayout } from "./types";

/**
 * UI Generator Agent
 * Creates component structure and page layouts from requirements.
 */
export async function uiGeneratorAgent(ctx: AgentContext): Promise<AgentContext> {
  ctx.logs.push("[UIGeneratorAgent] Designing component structure...");

  if (!ctx.requirements) {
    ctx.errors.push("[UIGeneratorAgent] No requirements found");
    return ctx;
  }

  ctx.logs.push("[UIGeneratorAgent] ENABLE SAFE EDITING MODE: Appending new sections to existing component structures.");

  const req = ctx.requirements;

  // Build page layouts
  const pages: PageLayout[] = req.pages.map((page) => {
    let components: string[] = ["Navbar"];

    switch (page) {
      case "index":
        if (req.projectType === "landing") {
          components.push("Hero", "Features", "Testimonials", "Pricing", "CTA", "Footer");
        } else if (req.projectType === "dashboard") {
          components.push("Sidebar", "StatsGrid", "ChartArea");
        } else if (req.projectType === "portfolio") {
          components.push("Hero", "Skills", "Projects", "Footer");
        } else if (req.projectType === "ecommerce") {
          components.push("Hero", "ProductGrid", "Footer");
        } else if (req.projectType === "restaurant") {
          components.push("Hero", "Menu", "Reservation", "Footer");
        } else {
          components.push("Hero", "Features", "Footer");
        }
        break;
      case "about":
        components.push("AboutHero", "Team", "Footer");
        break;
      case "contact":
        components.push("ContactForm", "Footer");
        break;
      case "pricing":
        components.push("PricingHero", "Pricing", "FAQ", "Footer");
        break;
      default:
        components.push("Hero", "Footer");
    }

    // Filter to only include components from requirements
    components = components.filter(
      (c) => req.components.includes(c) || ["Navbar", "Footer", "Hero"].includes(c)
    );

    return {
      name: page,
      route: page === "index" ? "/" : `/${page}`,
      components,
      layout: req.layout,
    };
  });

  // Shared components (used across pages)
  const sharedComponents = ["Navbar", "Footer", "Button", "Card"];

  // Styles
  const styles = ["globals.css", "components.css"];

  const structure: ComponentStructure = {
    pages,
    sharedComponents,
    styles,
  };

  ctx.componentStructure = structure;
  ctx.logs.push(
    `[UIGeneratorAgent] ✓ ${pages.length} page(s), ${sharedComponents.length} shared components`
  );

  return ctx;
}
