import type { AgentContext } from "./types";

/**
 * Code Generator Agent
 * Generates React + Tailwind code for each component & page.
 */
export async function codeGeneratorAgent(ctx: AgentContext): Promise<AgentContext> {
  ctx.logs.push("[CodeGeneratorAgent] Generating code...");

  if (!ctx.requirements || !ctx.componentStructure) {
    ctx.errors.push("[CodeGeneratorAgent] Missing requirements or component structure");
    return ctx;
  }

  const req = ctx.requirements;
  const files: Record<string, string> = {};

  // ── Generate each component (do not overwrite existing unless told) ──────
  for (const componentName of req.components) {
    const existingComponent = ctx.existingFiles?.[`src/components/${componentName}.tsx`];
    if (existingComponent) {
      files[`src/components/${componentName}.tsx`] = existingComponent; // Preserve old component
    } else {
      const code = generateComponent(componentName, req.projectType, req.colorScheme);
      files[`src/components/${componentName}.tsx`] = code;
    }
  }

  // ── Generate page assemblies (SAFE EDITING: preserve layout) ───────────
  for (const page of ctx.componentStructure.pages) {
    const pagePath = `src/pages/${page.name}.tsx`;
    let existingPage = ctx.existingFiles?.[pagePath];

    if (existingPage) {
      // Safe Editing: parse and insert new components
      let updatedPage = existingPage;
      for (const comp of page.components) {
        // Insert import if missing
        if (!updatedPage.includes(`import ${comp} `)) {
          updatedPage = `import ${comp} from '../components/${comp}';\n` + updatedPage;
        }
        // Insert component into the layout if missing
        if (!updatedPage.includes(`<${comp} />`)) {
          // Find closing div to inject above
          const injectIndex = updatedPage.lastIndexOf('</div>');
          if (injectIndex !== -1) {
            updatedPage = updatedPage.slice(0, injectIndex) + `      <${comp} />\n    ` + updatedPage.slice(injectIndex);
          } else {
            updatedPage += `\n// Added missing component\n<${comp} />\n`;
          }
        }
      }
      files[pagePath] = updatedPage;
    } else {
      // New Page
      const imports = page.components.map((c) => `import ${c} from '../components/${c}';`).join("\n");
      const elements = page.components.map((c) => `      <${c} />`).join("\n");

      files[pagePath] = `import React from 'react';
${imports}

export default function ${capitalize(page.name)}Page() {
  return (
    <div className="min-h-screen bg-[#0a0b14] text-white">
${elements}
    </div>
  );
}
`;
    }
  }

  // ── Generate styles ─────────────────────────────────────
  files["src/styles/globals.css"] = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\nbody {\n  font-family: 'Space Grotesk', sans-serif;\n  background: #0a0b14;\n  color: #f1f5f9;\n}\n`;

  // ── Generate config ─────────────────────────────────────
  files["tailwind.config.js"] = `module.exports = {\n  content: ["./src/**/*.{js,ts,jsx,tsx}"],\n  theme: { extend: {} },\n  plugins: [],\n};\n`;

  files["package.json"] = JSON.stringify(
    {
      name: `agentic-${req.projectType}`,
      version: "0.1.0",
      private: true,
      scripts: { dev: "next dev", build: "next build", start: "next start" },
      dependencies: { react: "^18", "react-dom": "^18", next: "14", tailwindcss: "^3" },
    },
    null,
    2
  );

  // ── Build preview HTML ──────────────────────────────────
  const previewHTML = buildFullPreview(req.projectType, req.components);

  ctx.generatedFiles = files;
  ctx.previewHTML = previewHTML;
  ctx.logs.push(
    `[CodeGeneratorAgent] ✓ Generated ${Object.keys(files).length} files`
  );

  return ctx;
}

// ─────────────────────────────────────────────
// Component templates
// ─────────────────────────────────────────────
function generateComponent(name: string, projectType: string, _colorScheme: string): string {
  const templates: Record<string, string> = {
    Navbar: `import React from 'react';

const Navbar: React.FC = () => (
  <nav className="sticky top-0 z-50 border-b border-slate-800 bg-[#0a0b14]/90 backdrop-blur-xl px-8 py-4 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-black text-sm">A</div>
      <span className="font-bold text-xl">Agentic</span>
    </div>
    <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
      {["Home","Features","Pricing","Contact"].map(l => <a key={l} href={"#"+l.toLowerCase()} className="hover:text-white transition-colors">{l}</a>)}
    </div>
    <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-600/20">Get Started</button>
  </nav>
);

export default Navbar;`,

    Hero: `import React from 'react';

const Hero: React.FC = () => (
  <section className="max-w-6xl mx-auto px-8 pt-28 pb-20 text-center">
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-400 text-xs font-bold mb-8 uppercase tracking-widest">
      <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
      AI Powered
    </div>
    <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-6 leading-tight" style={{ background:"linear-gradient(180deg,#fff 0%,#94a3b8 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
      Build Something<br/>Amazing Today
    </h1>
    <p className="text-slate-400 text-xl max-w-2xl mx-auto mb-12 leading-relaxed">Transform your ideas into reality with cutting-edge technology and beautiful design.</p>
    <div className="flex items-center justify-center gap-4">
      <button className="px-10 py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl font-bold text-lg shadow-2xl shadow-blue-600/30 hover:scale-[1.02] transition-all">Get Started Free</button>
      <button className="px-10 py-4 border border-slate-700 hover:border-blue-600/30 rounded-2xl font-bold text-lg text-slate-300 transition-all">Learn More →</button>
    </div>
  </section>
);

export default Hero;`,

    Features: `import React from 'react';

const features = [
  { icon: "⚡", title: "Lightning Fast", desc: "Optimized for speed and performance." },
  { icon: "🎨", title: "Beautiful Design", desc: "Modern, responsive UI out of the box." },
  { icon: "🔒", title: "Secure", desc: "Enterprise-grade security built in." },
  { icon: "📊", title: "Analytics", desc: "Real-time insights and data." },
  { icon: "🔌", title: "Integrations", desc: "Connect with your favorite tools." },
  { icon: "🚀", title: "Scalable", desc: "Grows with your business needs." },
];

const Features: React.FC = () => (
  <section id="features" className="max-w-6xl mx-auto px-8 py-24">
    <div className="text-center mb-16">
      <p className="text-blue-400 text-sm font-bold uppercase tracking-widest mb-4">Features</p>
      <h2 className="text-4xl font-bold mb-4">Everything you need</h2>
      <p className="text-slate-400 text-lg max-w-xl mx-auto">All the tools you need to build, deploy, and scale.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {features.map(f => (
        <div key={f.title} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-blue-600/30 transition-all group">
          <div className="text-3xl mb-4">{f.icon}</div>
          <h3 className="font-bold text-lg mb-2 group-hover:text-blue-400 transition-colors">{f.title}</h3>
          <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
        </div>
      ))}
    </div>
  </section>
);

export default Features;`,

    Testimonials: `import React from 'react';

const reviews = [
  { name: "Sarah K.", role: "CEO at StartupX", text: "Absolutely game-changing platform.", avatar: "SK" },
  { name: "Mike R.", role: "CTO at TechCo", text: "Best tool we've ever used for development.", avatar: "MR" },
  { name: "Emma L.", role: "Designer at Pixel", text: "The AI generates pixel-perfect designs.", avatar: "EL" },
];

const Testimonials: React.FC = () => (
  <section className="max-w-6xl mx-auto px-8 py-24">
    <div className="text-center mb-16">
      <p className="text-blue-400 text-sm font-bold uppercase tracking-widest mb-4">Testimonials</p>
      <h2 className="text-4xl font-bold mb-4">Loved by thousands</h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {reviews.map(r => (
        <div key={r.name} className="p-8 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-blue-600/30 transition-all">
          <div className="flex gap-1 mb-6">{Array.from({length:5}).map((_,i) => <span key={i} className="text-amber-400">★</span>)}</div>
          <p className="text-slate-300 text-lg leading-relaxed mb-8">"{r.text}"</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">{r.avatar}</div>
            <div><p className="font-bold text-sm">{r.name}</p><p className="text-slate-400 text-xs">{r.role}</p></div>
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default Testimonials;`,

    Pricing: `import React from 'react';

const plans = [
  { name: "Free", price: "$0", features: ["5 projects", "Basic features", "Community support"], highlight: false },
  { name: "Pro", price: "$29", features: ["Unlimited projects", "All features", "Priority support", "Custom domain"], highlight: true },
  { name: "Team", price: "$99", features: ["Everything in Pro", "Team collab", "Custom AI", "SLA"], highlight: false },
];

const Pricing: React.FC = () => (
  <section id="pricing" className="max-w-5xl mx-auto px-8 py-24">
    <div className="text-center mb-16">
      <p className="text-blue-400 text-sm font-bold uppercase tracking-widest mb-4">Pricing</p>
      <h2 className="text-4xl font-bold mb-4">Simple pricing</h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map(p => (
        <div key={p.name} className={\`p-8 rounded-2xl border flex flex-col transition-all \${p.highlight ? "border-blue-600/50 bg-blue-600/5 scale-105" : "border-slate-800 bg-slate-900/40"}\`}>
          {p.highlight && <span className="inline-block px-3 py-1 rounded-full bg-blue-600 text-xs font-bold mb-4 self-start">POPULAR</span>}
          <h3 className="text-xl font-bold mb-2">{p.name}</h3>
          <div className="flex items-end gap-1 mb-6"><span className="text-4xl font-black">{p.price}</span><span className="text-slate-400 mb-1">/mo</span></div>
          <ul className="space-y-3 mb-8 flex-1">{p.features.map(f => <li key={f} className="flex items-center gap-3 text-sm text-slate-300"><span className="text-emerald-400">✓</span>{f}</li>)}</ul>
          <button className={\`w-full py-3 rounded-xl font-semibold text-sm transition-all \${p.highlight ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg" : "border border-slate-700 text-slate-300 hover:border-blue-600/40"}\`}>{p.highlight ? "Start Trial" : "Get Started"}</button>
        </div>
      ))}
    </div>
  </section>
);

export default Pricing;`,

    ContactForm: `import React, { useState } from 'react';

const ContactForm: React.FC = () => {
  const [sent, setSent] = useState(false);
  return (
    <section id="contact" className="max-w-2xl mx-auto px-8 py-24">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold mb-4">Get in Touch</h2>
        <p className="text-slate-400">We'll respond within 24 hours.</p>
      </div>
      {sent ? (
        <div className="p-8 rounded-2xl border border-emerald-600/30 bg-emerald-600/5 text-center">
          <p className="text-4xl mb-4">✅</p><h3 className="text-2xl font-bold text-emerald-400 mb-2">Sent!</h3>
          <p className="text-slate-400">We'll get back to you shortly.</p>
        </div>
      ) : (
        <form onSubmit={e => { e.preventDefault(); setSent(true); }} className="p-8 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-300 mb-2">First Name</label><input className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-blue-600 focus:outline-none" placeholder="John"/></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-2">Last Name</label><input className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-blue-600 focus:outline-none" placeholder="Doe"/></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-300 mb-2">Email</label><input type="email" className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-blue-600 focus:outline-none" placeholder="john@example.com"/></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-2">Message</label><textarea rows={5} className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-blue-600 focus:outline-none resize-none" placeholder="Tell us about your project..."/></div>
          <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20">Send Message →</button>
        </form>
      )}
    </section>
  );
};

export default ContactForm;`,

    Footer: `import React from 'react';

const Footer: React.FC = () => (
  <footer className="border-t border-slate-800 bg-[#0d0f1a] py-12 px-8">
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-xs">A</div>
        <span className="font-bold">Agentic AI</span>
      </div>
      <div className="flex items-center gap-8 text-sm text-slate-400">
        {["Privacy","Terms","Docs","Support"].map(l => <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>)}
      </div>
      <p className="text-sm text-slate-500">© 2026 Agentic AI</p>
    </div>
  </footer>
);

export default Footer;`,

    Sidebar: `import React from 'react';

const items = ["Dashboard","Reports","Users","Products","Settings"];

const Sidebar: React.FC = () => (
  <aside className="w-64 border-r border-slate-800 flex flex-col bg-[#0d0f1a] min-h-screen">
    <div className="p-6 border-b border-slate-800 flex items-center gap-3">
      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-xs font-black">A</div>
      <span className="font-bold text-lg">Dashboard</span>
    </div>
    <nav className="flex-1 p-4 space-y-1">
      {items.map((item, i) => (
        <button key={item} className={\`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all \${i === 0 ? "bg-blue-600/20 text-blue-400" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}\`}>{item}</button>
      ))}
    </nav>
  </aside>
);

export default Sidebar;`,

    StatsGrid: `import React from 'react';

const stats = [
  { label: "Total Users", value: "128,432", change: "+12.4%", up: true },
  { label: "Revenue", value: "$48,230", change: "+8.1%", up: true },
  { label: "Sessions", value: "3,841", change: "-2.3%", up: false },
  { label: "Conversion", value: "5.74%", change: "+0.9%", up: true },
];

const StatsGrid: React.FC = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
    {stats.map(s => (
      <div key={s.label} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-blue-600/20 transition-all">
        <p className="text-slate-400 text-sm mb-3">{s.label}</p>
        <p className="text-3xl font-bold mb-2">{s.value}</p>
        <span className={\`text-xs font-bold \${s.up ? "text-emerald-400" : "text-red-400"}\`}>{s.change}</span>
      </div>
    ))}
  </div>
);

export default StatsGrid;`,

    CTA: `import React from 'react';

const CTA: React.FC = () => (
  <section className="max-w-4xl mx-auto px-8 py-24 text-center">
    <h2 className="text-4xl font-bold mb-4">Ready to get started?</h2>
    <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">Join thousands of users building with AI. Start for free today.</p>
    <div className="flex items-center justify-center gap-4">
      <button className="px-12 py-5 bg-blue-600 hover:bg-blue-700 rounded-2xl font-bold text-xl shadow-2xl shadow-blue-600/30 hover:scale-[1.02] transition-all">Start Building →</button>
    </div>
  </section>
);

export default CTA;`,

    Menu: `import React from 'react';

const menuItems = [
  { name: "Grilled Salmon", price: "$24", desc: "Fresh Atlantic salmon with herbs", category: "Mains" },
  { name: "Caesar Salad", price: "$14", desc: "Romaine, croutons, parmesan", category: "Starters" },
  { name: "Wagyu Burger", price: "$28", desc: "Premium wagyu with truffle aioli", category: "Mains" },
  { name: "Tiramisu", price: "$12", desc: "Classic Italian dessert", category: "Desserts" },
];

const Menu: React.FC = () => (
  <section className="max-w-4xl mx-auto px-8 py-24">
    <div className="text-center mb-16">
      <p className="text-blue-400 text-sm font-bold uppercase tracking-widest mb-4">Our Menu</p>
      <h2 className="text-4xl font-bold mb-4">Signature Dishes</h2>
    </div>
    <div className="space-y-4">
      {menuItems.map(item => (
        <div key={item.name} className="flex items-center justify-between p-6 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-blue-600/30 transition-all">
          <div>
            <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">{item.category}</span>
            <h3 className="font-bold text-lg">{item.name}</h3>
            <p className="text-slate-400 text-sm">{item.desc}</p>
          </div>
          <span className="text-2xl font-bold text-blue-400">{item.price}</span>
        </div>
      ))}
    </div>
  </section>
);

export default Menu;`,

    Reservation: `import React from 'react';

const Reservation: React.FC = () => (
  <section className="max-w-2xl mx-auto px-8 py-24">
    <div className="text-center mb-12">
      <h2 className="text-4xl font-bold mb-4">Reserve a Table</h2>
      <p className="text-slate-400">Book your dining experience</p>
    </div>
    <form className="p-8 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-slate-300 mb-2">Date</label><input type="date" className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-blue-600 focus:outline-none"/></div>
        <div><label className="block text-sm font-medium text-slate-300 mb-2">Time</label><input type="time" className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-blue-600 focus:outline-none"/></div>
      </div>
      <div><label className="block text-sm font-medium text-slate-300 mb-2">Guests</label><select className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-blue-600 focus:outline-none">{[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} Guest{n>1?"s":""}</option>)}</select></div>
      <div><label className="block text-sm font-medium text-slate-300 mb-2">Name</label><input className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-blue-600 focus:outline-none" placeholder="Your name"/></div>
      <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20">Reserve Now</button>
    </form>
  </section>
);

export default Reservation;`,

    ProductCard: `import React from 'react';

const products = [
  { name: "Premium Headphones", price: "$299", image: "🎧", rating: 4.8 },
  { name: "Wireless Speaker", price: "$149", image: "🔊", rating: 4.6 },
  { name: "Smart Watch", price: "$399", image: "⌚", rating: 4.9 },
  { name: "Camera Lens", price: "$599", image: "📷", rating: 4.7 },
];

const ProductCard: React.FC = () => (
  <section className="max-w-6xl mx-auto px-8 py-24">
    <h2 className="text-3xl font-bold mb-8">Featured Products</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map(p => (
        <div key={p.name} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-blue-600/30 transition-all group cursor-pointer">
          <div className="text-6xl mb-4 text-center">{p.image}</div>
          <h3 className="font-bold mb-1 group-hover:text-blue-400 transition-colors">{p.name}</h3>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-blue-400">{p.price}</span>
            <span className="text-sm text-amber-400">★ {p.rating}</span>
          </div>
          <button className="w-full mt-4 py-2.5 border border-slate-700 hover:bg-blue-600 hover:border-blue-600 rounded-xl text-sm font-semibold transition-all">Add to Cart</button>
        </div>
      ))}
    </div>
  </section>
);

export default ProductCard;`,

    Gallery: `import React from 'react';

const Gallery: React.FC = () => (
  <section className="max-w-6xl mx-auto px-8 py-24">
    <h2 className="text-3xl font-bold mb-8 text-center">Gallery</h2>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({length:6}).map((_,i) => (
        <div key={i} className="aspect-square rounded-2xl border border-slate-800 bg-slate-900/40 flex items-center justify-center text-4xl hover:border-blue-600/30 transition-all cursor-pointer">
          {["🏔️","🌊","🌅","🏙️","🌿","🎨"][i]}
        </div>
      ))}
    </div>
  </section>
);

export default Gallery;`,
  };

  // Fallback for unknown components
  return (
    templates[name] ??
    `import React from 'react';\n\nconst ${name}: React.FC = () => (\n  <section className="max-w-6xl mx-auto px-8 py-24">\n    <h2 className="text-3xl font-bold mb-4">${name}</h2>\n    <p className="text-slate-400">Component generated by Agentic AI</p>\n  </section>\n);\n\nexport default ${name};\n`
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildFullPreview(projectType: string, components: string[]): string {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>body{font-family:'Space Grotesk',sans-serif;margin:0;}</style>
</head><body class="bg-slate-950 text-white">
<div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:1rem">
  <div style="font-size:3rem">🚀</div>
  <h1 style="font-size:2rem;font-weight:bold">${capitalize(projectType)} Preview</h1>
  <p style="color:#64748b">${components.length} components generated</p>
</div>
</body></html>`;
}
