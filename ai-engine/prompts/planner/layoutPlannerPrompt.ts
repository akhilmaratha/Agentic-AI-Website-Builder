export const layoutPlannerPrompt = `Layout planning guidance (use this to decide which sections and components to generate):

Analyze the user request and include relevant sections from this list:
- Navbar: sticky top nav with logo, links, and CTA button
- Hero: large headline, sub-headline, CTA buttons, optional hero image
- Features: 3-column grid of feature cards with icons
- Testimonials: quote cards with author name, role, and avatar
- Pricing: 2-3 tier cards, highlight the recommended plan
- FAQ: accordion or grid of questions and answers
- Contact: form with name, email, message fields
- Footer: links, copyright, social icons

Include only the sections relevant to the user's request. Generate each section as a separate file in the "files" output.`;
