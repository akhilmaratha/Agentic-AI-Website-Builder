import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/mongoose";
import { extractClientIp, getPlanRequestLimit, incrementRateLimit } from "@/lib/rateLimit";
import { systemPrompt } from "@/ai-engine/prompts/system/systemPrompt";
import { ChatMessage, checkAndIncrementGeneration, FileModel, Project, User, Version } from "@/server/models";
import { buildExpandedCreationPrompt, shouldExpandPrompt } from "@/server/services/promptExpansion";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface ChatRequestBody {
  message?: string;
  messages?: { role: string; content: string }[];
  prompt?: string;
  projectId?: string;
  projectContext?: {
    projectName?: string;
    files?: Record<string, string>;
    currentFile?: string;
  };
}

interface ChatResponse {
  type: "code_update" | "message_only";
  reply: string;
  files?: Record<string, string>;
  preview?: string;
  filename?: string;
  code?: string;
}

function parseAIJsonResponse(raw: string): ChatResponse {
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  try {
    return JSON.parse(stripped) as ChatResponse;
  } catch {
    // Some models prepend/append text around JSON. Extract the largest JSON block.
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const candidate = stripped.slice(start, end + 1);
      return JSON.parse(candidate) as ChatResponse;
    }
    throw new Error("Could not parse AI response as JSON");
  }
}

function getAIConfig() {
  return {
    apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || process.env.AI_API_KEY || "",
    baseURL: process.env.AI_BASE_URL || "https://openrouter.ai/api/v1",
    model: process.env.AI_MODEL || "deepseek/deepseek-chat",
  };
}

function getModelCandidates(model: string, baseURL: string): string[] {
  const candidates = [model];
  if (baseURL.includes("openrouter.ai")) {
    candidates.push("deepseek/deepseek-chat");
    candidates.push("deepseek/deepseek-r1");
  }
  return [...new Set(candidates.filter(Boolean))];
}

function getAIHeaders(apiKey: string, baseURL: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  if (baseURL.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = process.env.NEXTAUTH_URL || "http://localhost:3000";
    headers["X-Title"] = "Agentic AI Website Builder";
  }

  return headers;
}

// ─────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = systemPrompt;

// ─────────────────────────────────────────────
// Preview HTML wrapper
// Accepts either:
//   (a) a complete HTML string (returned as-is), or
//   (b) React/TSX source code (compiled in the iframe via Babel standalone)
// ─────────────────────────────────────────────
function buildPreviewHTML(title = "Preview", source = ""): string {
  // If no source, return a minimal loading placeholder
  if (!source.trim()) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-[#0a0b14] text-white flex items-center justify-center h-screen">
<p class="text-slate-500 text-sm">Send a message to generate a preview.</p>
</body></html>`;
  }

  // If it looks like a complete HTML doc, return it directly
  if (source.trimStart().startsWith("<!DOCTYPE") || source.trimStart().startsWith("<html")) {
    return source;
  }

  // Otherwise treat it as React/TSX — compile in the browser via Babel standalone
  // Strip TypeScript-only constructs that Babel standalone doesn't understand
  const babelCode = source
    // Remove import lines (React, hooks, lucide-react etc. — they'll be global)
    .replace(/^import\s[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, "")
    // Remove "use client" directive
    .replace(/^['"]use client['"];?\s*$/gm, "")
    // Remove interface / type declarations
    .replace(/^(export\s+)?(interface|type)\s+\w+[\s\S]*?^}/gm, "")
    // Remove TypeScript generics from useState<X>  →  useState
    .replace(/\buseState<[^>]+>/g, "useState")
    // Remove : TypeAnnotation from function params (basic patterns)
    .replace(/:\s*(string|number|boolean|void|never|any|unknown|React\.FC[^,)]*)([\s,)=])/g, "$2")
    // Remove export default — we'll render the component manually
    .replace(/^export\s+default\s+function\s+/gm, "function ")
    .replace(/^export\s+default\s+/gm, "")
    // Remove named exports
    .replace(/^export\s+\{[^}]*\};?\s*$/gm, "")
    .trim();

  // Find the last top-level function/const component name to render
  const funcMatches = [...babelCode.matchAll(/^(?:function|const)\s+([A-Z][A-Za-z0-9_]*)/gm)];
  const componentName = funcMatches.length > 0
    ? funcMatches[funcMatches.length - 1][1]
    : "App";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { margin: 0; }
    @keyframes pulse-anim { 0%,100%{opacity:1} 50%{opacity:.5} }
    .animate-pulse { animation: pulse-anim 2s cubic-bezier(.4,0,.6,1) infinite; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react">
    const { useState, useEffect, useRef, useCallback } = React;
${babelCode}
    const rootEl = document.getElementById('root');
    if (rootEl && typeof ${componentName} !== 'undefined') {
      ReactDOM.createRoot(rootEl).render(React.createElement(${componentName}));
    } else {
      rootEl.innerHTML = '<p style="color:#64748b;padding:2rem">Component not found.</p>';
    }
  </script>
</body>
</html>`;
}

function deriveProjectNameFromPrompt(prompt: string): string {
  const normalized = prompt
    .replace(/["'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const patterns = [
    /create\s+(?:a|an)?\s*(.+)/i,
    /build\s+(?:a|an)?\s*(.+)/i,
    /make\s+(?:a|an)?\s*(.+)/i,
    /design\s+(?:a|an)?\s*(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      const raw = match[1].split(/[.,!?]/)[0].trim();
      const clipped = raw.slice(0, 48).trim();
      if (!clipped) continue;
      return clipped
        .split(" ")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    }
  }

  const fallback = normalized.slice(0, 48).trim();
  if (!fallback) return "New Project";
  return fallback
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

async function generateProjectName(prompt: string): Promise<string> {
  const fallback = deriveProjectNameFromPrompt(prompt);
  const { apiKey, baseURL, model } = getAIConfig();
  if (!apiKey) return fallback;

  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: getAIHeaders(apiKey, baseURL),
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 20,
        messages: [
          {
            role: "system",
            content:
              "You create concise website project names. Return only a short title (2-5 words), no punctuation at the end.",
          },
          {
            role: "user",
            content: `Prompt: ${prompt}`,
          },
        ],
      }),
    });

    if (!res.ok) return fallback;
    const data = await res.json();
    const candidate = String(data?.choices?.[0]?.message?.content || "").trim();
    if (!candidate) return fallback;

    const normalized = candidate.replace(/["'`]/g, "").slice(0, 48).trim();
    return normalized || fallback;
  } catch {
    return fallback;
  }
}

// ─────────────────────────────────────────────
// Local fallback generator
// ─────────────────────────────────────────────
function localGenerate(prompt: string): ChatResponse {
  const lower = prompt.toLowerCase();

  // ── Landing / SaaS ────────────────────────────────────────
  if (lower.includes("landing") || lower.includes("saas") || lower.includes("hero") || lower.includes("startup")) {
    const code = `import React from 'react';

const features = [
  { icon: "⚡", title: "Lightning Fast",  desc: "Deploy in milliseconds with our global edge network." },
  { icon: "🤖", title: "AI-Powered",      desc: "Every component intelligently crafted by our neural engine." },
  { icon: "🚀", title: "One-Click Deploy",desc: "From prompt to production in seconds." },
];

const LandingPage: React.FC = () => (
  <div className="min-h-screen bg-[#0a0b14] text-white">
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-[#0a0b14]/80 backdrop-blur-xl px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-black text-sm">A</div>
        <span className="font-bold text-xl">AgenticSaaS</span>
      </div>
      <div className="hidden md:flex items-center gap-8 text-slate-400 text-sm">
        {["Features","Pricing","Docs","Blog"].map(l => <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>)}
      </div>
      <div className="flex items-center gap-3">
        <button className="text-slate-400 hover:text-white text-sm px-4 py-2">Login</button>
        <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20">Get Started</button>
      </div>
    </nav>
    <main className="max-w-6xl mx-auto px-8 pt-28 pb-32 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-400 text-xs font-bold mb-8 uppercase tracking-widest">
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
        Now in Public Beta
      </div>
      <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-6 leading-tight"
          style={{ background:"linear-gradient(180deg,#fff 0%,#94a3b8 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
        Build the Future<br/>with Intelligence
      </h1>
      <p className="text-slate-400 text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
        Transform your ideas into production-ready applications using our agentic AI platform.
      </p>
      <div className="flex items-center justify-center gap-4 mb-24">
        <button className="px-10 py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl font-bold text-lg shadow-2xl shadow-blue-600/30 hover:scale-105 transition-all">Start Free Trial</button>
        <button className="px-10 py-4 border border-slate-700 hover:border-blue-600/40 rounded-2xl font-bold text-lg text-slate-300 transition-all">Watch Demo →</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        {features.map(f => (
          <div key={f.title} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-blue-600/30 transition-all">
            <div className="text-3xl mb-4">{f.icon}</div>
            <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  </div>
);

export default LandingPage;`;

    return {
      type: "code_update",
      reply: "Here's a modern SaaS landing page with a sticky navbar, animated badge hero, and a responsive features grid. Dark theme with blue accents.",
      files: {
        "src/components/LandingPage.tsx": code,
        "src/pages/index.tsx": `import React from 'react';\nimport LandingPage from '../components/LandingPage';\nexport default function Home() { return <LandingPage />; }`,
      },
      filename: "LandingPage.tsx",
      code,
      preview: buildPreviewHTML("SaaS Landing"),
    };
  }

  // ── Dashboard / Analytics ──────────────────────────────────
  if (lower.includes("dashboard") || lower.includes("analytics") || lower.includes("admin")) {
    const code = `import React from 'react';

const stats = [
  { label: "Total Users",     value: "128,432", change: "+12.4%", up: true  },
  { label: "Revenue",         value: "$48,230", change: "+8.1%",  up: true  },
  { label: "Active Sessions", value: "3,841",   change: "-2.3%",  up: false },
  { label: "Conversion Rate", value: "5.74%",   change: "+0.9%",  up: true  },
];
const navItems = ["Dashboard","Reports","Users","Products","Settings"];

const Dashboard: React.FC = () => (
  <div className="min-h-screen bg-[#0a0b14] text-white flex">
    <aside className="w-64 border-r border-slate-800 flex flex-col bg-[#0d0f1a]">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-xs font-black">A</div>
        <span className="font-bold text-lg">Analytics Pro</span>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => (
          <button key={item} className={\`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all \${item === "Dashboard" ? "bg-blue-600/20 text-blue-400 border border-blue-600/20" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}\`}>
            {item}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">JD</div>
          <div><p className="text-sm font-semibold">Jane Doe</p><p className="text-xs text-slate-400">Admin</p></div>
        </div>
      </div>
    </aside>
    <main className="flex-1 overflow-auto p-8">
      <div className="flex items-center justify-between mb-10">
        <div><h1 className="text-3xl font-bold mb-1">Dashboard</h1><p className="text-slate-400">Welcome back! Here's what's happening today.</p></div>
        <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20">Export Report</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map(s => (
          <div key={s.label} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-blue-600/20 transition-all">
            <p className="text-slate-400 text-sm mb-3">{s.label}</p>
            <p className="text-3xl font-bold mb-2">{s.value}</p>
            <span className={\`text-xs font-bold \${s.up ? "text-emerald-400" : "text-red-400"}\`}>{s.change} vs last month</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 p-8 rounded-2xl border border-slate-800 bg-slate-900/30 flex items-center justify-center h-72">
          <div className="text-center text-slate-500"><p className="text-4xl mb-3">📈</p><p className="font-semibold text-slate-400">Revenue Over Time</p><p className="text-sm mt-1">Connect analytics to view charts</p></div>
        </div>
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30">
          <h3 className="font-bold mb-4">Top Sources</h3>
          {[{src:"Direct",pct:45},{src:"Organic",pct:30},{src:"Referral",pct:15},{src:"Social",pct:10}].map(r => (
            <div key={r.src} className="mb-4">
              <div className="flex justify-between text-sm mb-1.5"><span className="text-slate-300">{r.src}</span><span className="text-slate-400">{r.pct}%</span></div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{width:\`\${r.pct}%\`}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  </div>
);

export default Dashboard;`;

    return {
      type: "code_update",
      reply: "Here's a full analytics dashboard with a sidebar nav, 4 stat cards with trend indicators, a chart placeholder, and traffic sources breakdown.",
      files: {
        "src/components/Dashboard.tsx": code,
        "src/pages/index.tsx": `import React from 'react';\nimport Dashboard from '../components/Dashboard';\nexport default function Home() { return <Dashboard />; }`,
      },
      filename: "Dashboard.tsx",
      code,
      preview: buildPreviewHTML("Dashboard"),
    };
  }

  // ── Portfolio ──────────────────────────────────────────────
  if (lower.includes("portfolio") || lower.includes("personal") || lower.includes("resume")) {
    const code = `import React from 'react';

const projects = [
  { title:"AI Website Builder",  tech:"Next.js · TypeScript · AI",  color:"from-blue-600 to-purple-600",  desc:"Agentic AI platform that builds websites from prompts." },
  { title:"E-commerce Platform", tech:"React · Node.js · MongoDB",   color:"from-emerald-600 to-teal-600", desc:"Full-stack e-commerce with real-time inventory." },
  { title:"Real-time Dashboard", tech:"React · WebSockets · Redis",  color:"from-orange-600 to-red-600",   desc:"High-performance analytics with 100ms refresh rates." },
];
const skills = ["TypeScript","React","Next.js","Node.js","TailwindCSS","PostgreSQL","Redis","Docker"];

const Portfolio: React.FC = () => (
  <div className="min-h-screen bg-[#0a0b14] text-white">
    <div className="max-w-4xl mx-auto px-8 py-24">
      <div className="mb-20">
        <div className="w-20 h-20 rounded-3xl bg-blue-600 flex items-center justify-center text-3xl font-black mb-8">J</div>
        <h1 className="text-5xl font-bold mb-4">Jane Developer</h1>
        <p className="text-slate-400 text-xl leading-relaxed max-w-xl mb-8">Full-stack engineer & AI enthusiast. Building products that matter.</p>
        <div className="flex items-center gap-4">
          <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold shadow-lg shadow-blue-600/20">View Resume</button>
          <button className="px-6 py-3 border border-slate-700 hover:border-blue-600/40 rounded-xl font-semibold text-slate-300">Contact Me</button>
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-5">Skills</h2>
      <div className="flex flex-wrap gap-2 mb-20">
        {skills.map(s => <span key={s} className="px-4 py-2 rounded-full bg-slate-800/70 border border-slate-700 text-sm font-medium text-slate-300">{s}</span>)}
      </div>
      <h2 className="text-2xl font-bold mb-6">Selected Work</h2>
      <div className="space-y-4">
        {projects.map(p => (
          <div key={p.title} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 hover:border-blue-600/30 transition-all cursor-pointer group">
            <span className={\`inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r \${p.color} mb-3\`}>{p.tech}</span>
            <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">{p.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default Portfolio;`;

    return {
      type: "code_update",
      reply: "Here's a clean dark portfolio with an about section, skills badges, and project cards with gradient tech labels.",
      files: { "src/components/Portfolio.tsx": code },
      filename: "Portfolio.tsx",
      code,
      preview: buildPreviewHTML("Portfolio"),
    };
  }

  // ── Testimonials ───────────────────────────────────────────
  if (lower.includes("testimonial") || lower.includes("review") || lower.includes("feedback")) {
    const code = `import React from 'react';

const reviews = [
  { name:"Sarah K.",  role:"CTO at DevCorp",    text:"This platform 10x'd our team's velocity.", avatar:"SK" },
  { name:"Mike R.",   role:"Founder, Launchify", text:"Went from idea to deployed SaaS in 48 hours.", avatar:"MR" },
  { name:"Emma L.",   role:"Lead Dev at Nexus",  text:"The AI-generated components are production-quality.", avatar:"EL" },
];

const Testimonials: React.FC = () => (
  <section className="py-32 bg-[#0a0b14]">
    <div className="max-w-6xl mx-auto px-8">
      <div className="text-center mb-16">
        <p className="text-blue-400 text-sm font-bold uppercase tracking-widest mb-4">Testimonials</p>
        <h2 className="text-5xl font-bold mb-4" style={{ background:"linear-gradient(180deg,#fff 0%,#94a3b8 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Loved by developers</h2>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">Join thousands of developers who transformed their workflow.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reviews.map(r => (
          <div key={r.name} className="p-8 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-blue-600/30 transition-all">
            <div className="flex gap-1 mb-6">{Array.from({length:5}).map((_,i) => <span key={i} className="text-amber-400 text-lg">★</span>)}</div>
            <p className="text-slate-300 text-lg leading-relaxed mb-8">"{r.text}"</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">{r.avatar}</div>
              <div><p className="font-bold text-sm">{r.name}</p><p className="text-slate-400 text-xs">{r.role}</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;`;

    return {
      type: "code_update",
      reply: "Here's a testimonials section with star ratings, quote cards, and avatar initials. Responsive 3-column grid with hover effects.",
      files: { "src/components/Testimonials.tsx": code },
      filename: "Testimonials.tsx",
      code,
      preview: buildPreviewHTML("Testimonials"),
    };
  }

  // ── Pricing ────────────────────────────────────────────────
  if (lower.includes("pricing") || lower.includes("plan") || lower.includes("subscription")) {
    const code = `import React from 'react';

const plans = [
  { name:"Starter", price:"$0",  features:["5 AI builds/month","Basic components","Community support","1 project"], cta:"Get Started",     highlight:false },
  { name:"Pro",     price:"$29", features:["Unlimited AI builds","All components","Priority support","10 projects","Custom domain"], cta:"Start Pro Trial", highlight:true  },
  { name:"Team",    price:"$99", features:["Everything in Pro","Team collaboration","Custom AI models","Unlimited projects","SLA"], cta:"Contact Sales", highlight:false },
];

const Pricing: React.FC = () => (
  <section className="py-32 bg-[#0a0b14]">
    <div className="max-w-5xl mx-auto px-8">
      <div className="text-center mb-16">
        <p className="text-blue-400 text-sm font-bold uppercase tracking-widest mb-4">Pricing</p>
        <h2 className="text-5xl font-bold mb-4" style={{ background:"linear-gradient(180deg,#fff 0%,#94a3b8 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Simple, transparent pricing</h2>
        <p className="text-slate-400 text-lg">Start free. Scale as you grow. Cancel anytime.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(p => (
          <div key={p.name} className={\`p-8 rounded-2xl border transition-all flex flex-col \${p.highlight ? "border-blue-600/50 bg-blue-600/5 ring-1 ring-blue-600/20 scale-105" : "border-slate-800 bg-slate-900/40 hover:border-blue-600/20"}\`}>
            {p.highlight && <span className="inline-block px-3 py-1 rounded-full bg-blue-600 text-xs font-bold mb-4 self-start">MOST POPULAR</span>}
            <h3 className="text-xl font-bold mb-2">{p.name}</h3>
            <div className="flex items-end gap-1 mb-6"><span className="text-4xl font-black">{p.price}</span><span className="text-slate-400 mb-1">/mo</span></div>
            <ul className="space-y-3 mb-8 flex-1">
              {p.features.map(f => <li key={f} className="flex items-center gap-3 text-sm text-slate-300"><span className="text-emerald-400">✓</span>{f}</li>)}
            </ul>
            <button className={\`w-full py-3 rounded-xl font-semibold text-sm transition-all \${p.highlight ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20" : "border border-slate-700 hover:border-blue-600/40 text-slate-300"}\`}>{p.cta}</button>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Pricing;`;

    return {
      type: "code_update",
      reply: "Here's a 3-tier pricing section with a highlighted Pro plan, feature lists with check marks, and responsive scaling.",
      files: { "src/components/Pricing.tsx": code },
      filename: "Pricing.tsx",
      code,
      preview: buildPreviewHTML("Pricing"),
    };
  }

  // ── Contact form ───────────────────────────────────────────
  if (lower.includes("contact") || lower.includes("form") || lower.includes("email")) {
    const code = `import React, { useState } from 'react';

const ContactForm: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  return (
    <section className="py-32 bg-[#0a0b14]">
      <div className="max-w-2xl mx-auto px-8">
        <div className="text-center mb-12">
          <p className="text-blue-400 text-sm font-bold uppercase tracking-widest mb-4">Contact</p>
          <h2 className="text-5xl font-bold mb-4">Get in Touch</h2>
          <p className="text-slate-400 text-lg">We'll respond within 24 hours.</p>
        </div>
        {submitted ? (
          <div className="p-8 rounded-2xl border border-emerald-600/30 bg-emerald-600/5 text-center">
            <p className="text-4xl mb-4">✅</p>
            <h3 className="text-2xl font-bold mb-2 text-emerald-400">Message Sent!</h3>
            <p className="text-slate-400">We'll get back to you shortly.</p>
          </div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); setSubmitted(true); }} className="p-8 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-300 mb-2">First Name</label><input className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-600 focus:outline-none" placeholder="John"/></div>
              <div><label className="block text-sm font-medium text-slate-300 mb-2">Last Name</label><input className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-600 focus:outline-none" placeholder="Doe"/></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-300 mb-2">Email</label><input type="email" className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-600 focus:outline-none" placeholder="john@example.com"/></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-2">Message</label><textarea rows={5} className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-600 focus:outline-none resize-none" placeholder="Tell us about your project..."/></div>
            <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20">Send Message →</button>
          </form>
        )}
      </div>
    </section>
  );
};

export default ContactForm;`;

    return {
      type: "code_update",
      reply: "Here's a contact form with name, email and message fields, plus a success confirmation state.",
      files: { "src/components/ContactForm.tsx": code },
      filename: "ContactForm.tsx",
      code,
      preview: buildPreviewHTML("Contact"),
    };
  }

  // ── Navbar ─────────────────────────────────────────────────
  if (lower.includes("nav") || lower.includes("header") || lower.includes("menu")) {
    const code = `import React, { useState } from 'react';

const Navbar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const links = ["Features","Pricing","Docs","Blog"];
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0a0b14]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-black text-sm">A</div>
          <span className="font-bold text-xl">AgenticAI</span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          {links.map(l => <a key={l} href="#" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">{l}</a>)}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <button className="text-slate-400 hover:text-white text-sm px-4 py-2">Login</button>
          <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20">Get Started →</button>
        </div>
        <button onClick={() => setOpen(o => !o)} className="md:hidden p-2 text-slate-400 hover:text-white">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}/>
          </svg>
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-slate-800 bg-[#0d0f1a] px-6 py-4 space-y-3">
          {links.map(l => <a key={l} href="#" className="block text-slate-300 hover:text-white py-2 text-sm font-medium">{l}</a>)}
          <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold mt-2">Get Started</button>
        </div>
      )}
    </header>
  );
};

export default Navbar;`;

    return {
      type: "code_update",
      reply: "Here's a responsive sticky navbar with desktop links and a mobile hamburger menu.",
      files: { "src/components/Navbar.tsx": code },
      filename: "Navbar.tsx",
      code,
      preview: buildPreviewHTML("Navbar"),
    };
  }

  // ── Detect plain questions → message_only ──────────────────
  const isQuestion =
    lower.endsWith("?") ||
    /^(what|how|why|when|who|explain|tell me|can you|could you)\b/.test(lower);

  if (isQuestion) {
    return {
      type: "message_only",
      reply:
        `Great question about **"${prompt.slice(0, 100)}"**!\n\n` +
        `I'm an AI website builder — I generate React + Tailwind CSS components from your descriptions.\n\n` +
        `**Try prompts like:**\n` +
        `- *"Build a SaaS landing page with pricing"*\n` +
        `- *"Create a dark analytics dashboard"*\n` +
        `- *"Add a testimonials section"*\n` +
        `- *"Make a contact form"*\n` +
        `- *"Build a restaurant website"*\n\n` +
        `Just describe the UI and I'll generate the code instantly! 🚀`,
    };
  }

  // ── Default: generate a smart custom component ─────────────
  const stopWords = new Set(["the","and","for","with","that","this","from","make",
    "build","create","give","want","need","please","add","page","site","website",
    "app","me","can","a","an","of","to","in","on","at","by","as","is"]);
  const meaningfulWords = prompt
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w.toLowerCase()));
  const topicRaw = meaningfulWords[0] ?? "Custom";
  const topic = topicRaw.charAt(0).toUpperCase() + topicRaw.slice(1).toLowerCase();
  const componentName = topic.replace(/[^a-zA-Z0-9]/g, "") + "Page";
  const titleText = prompt.length > 55 ? prompt.slice(0, 55) + "\u2026" : prompt;

  const defaultCode = `import React, { useState } from 'react';

const tabData = [
  { icon: "⚡", title: "Lightning Fast",  desc: "Optimized from the ground up for speed and scale." },
  { icon: "🎨", title: "Beautiful UI",    desc: "Modern dark design with smooth hover animations." },
  { icon: "🔒", title: "Secure",          desc: "Enterprise-grade security baked into every layer." },
  { icon: "📊", title: "Analytics",       desc: "Real-time insights with live data streams." },
];

const ${componentName}: React.FC = () => {
  const [active, setActive] = useState(0);
  return (
    <div className="min-h-screen bg-[#0a0b14] text-white">
      <nav className="sticky top-0 z-50 border-b border-slate-800 bg-[#0a0b14]/90 backdrop-blur-xl px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-black text-sm">${topic.slice(0, 1)}</div>
          <span className="font-bold text-xl">${topic}</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
          {["Features","About","Pricing","Contact"].map(l => <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>)}
        </div>
        <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20">Get Started</button>
      </nav>
      <section className="max-w-5xl mx-auto px-8 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-400 text-xs font-bold mb-8 uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          AI Generated
        </div>
        <h1 className="text-6xl font-bold tracking-tight mb-6 leading-tight"
            style={{ background: "linear-gradient(180deg,#ffffff 0%,#94a3b8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          ${titleText}
        </h1>
        <p className="text-slate-400 text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
          A responsive, production-ready UI built from your prompt. Keep chatting to refine it further.
        </p>
        <div className="flex items-center justify-center gap-4 mb-20">
          <button className="px-10 py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl font-bold text-lg shadow-2xl shadow-blue-600/30 hover:scale-[1.02] transition-all">Get Started Free</button>
          <button className="px-10 py-4 border border-slate-700 hover:border-blue-600/30 rounded-2xl font-bold text-lg text-slate-300 transition-all">Learn More →</button>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabData.map((t, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={\`px-4 py-2 rounded-xl text-sm font-semibold transition-all \${active===i ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700"}\`}>
              {t.icon} {t.title}
            </button>
          ))}
        </div>
        <div className="p-10 rounded-3xl border border-slate-800 bg-slate-900/40 text-left max-w-2xl mx-auto">
          <div className="text-5xl mb-6">{tabData[active].icon}</div>
          <h3 className="text-2xl font-bold mb-3">{tabData[active].title}</h3>
          <p className="text-slate-400 text-lg leading-relaxed">{tabData[active].desc}</p>
        </div>
      </section>
      <div className="border-t border-slate-800 bg-slate-900/30">
        <div className="max-w-5xl mx-auto px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[{num:"10K+",label:"Users"},{num:"99.9%",label:"Uptime"},{num:"<50ms",label:"Response"},{num:"5★",label:"Rating"}].map(s => (
            <div key={s.label}>
              <p className="text-4xl font-black text-blue-400 mb-2">{s.num}</p>
              <p className="text-slate-500 text-sm font-medium uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
      <section className="max-w-3xl mx-auto px-8 py-24 text-center">
        <h2 className="text-4xl font-bold mb-4">Ready to get started?</h2>
        <p className="text-slate-400 text-lg mb-10">Join thousands building with AI.</p>
        <button className="px-12 py-5 bg-blue-600 hover:bg-blue-700 rounded-2xl font-bold text-xl shadow-2xl shadow-blue-600/30 hover:scale-[1.02] transition-all">Start Building Now →</button>
      </section>
    </div>
  );
};

export default ${componentName};`;

  return {
    type: "code_update",
    reply: `Here's a full-page component for **"${titleText}"** — nav, hero with interactive tabs, stats bar, and CTA. Ask me to add pricing, testimonials, a contact form, or change the colours!`,
    files: {
      [`src/components/${componentName}.tsx`]: defaultCode,
      "src/pages/index.tsx": `import React from 'react';\nimport ${componentName} from '../components/${componentName}';\nexport default function Home() { return <${componentName} />; }`,
    },
    filename: `${componentName}.tsx`,
    code: defaultCode,
    preview: buildPreviewHTML(titleText),
  };
}

// ─────────────────────────────────────────────
// Call the real AI model (OpenAI-compatible, including OpenRouter)
// ─────────────────────────────────────────────
async function callAIModel(
  messages: { role: string; content: string }[],
  apiKey: string,
  baseURL: string,
  model: string
): Promise<ChatResponse> {
  // Normalize roles: store uses "ai", chat APIs require "assistant"
  const normalized = messages.map((m) => ({
    ...m,
    role: m.role === "ai" ? "assistant" : m.role,
  }));

  let lastError: Error | null = null;

  for (const modelName of getModelCandidates(model, baseURL)) {
    const payloads = [
      {
        model: modelName,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...normalized],
        temperature: 0.7,
        max_tokens: 8192,
        response_format: { type: "json_object" },
      },
      {
        model: modelName,
        messages: [
          {
            role: "system",
            content: `${SYSTEM_PROMPT}\n\nReturn STRICT raw JSON object only. No markdown fences.`,
          },
          ...normalized,
        ],
        temperature: 0.6,
        max_tokens: 8192,
      },
    ];

    for (const payload of payloads) {
      try {
        const res = await fetch(`${baseURL}/chat/completions`, {
          method: "POST",
          headers: getAIHeaders(apiKey, baseURL),
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          let errBody = "";
          try { errBody = await res.text(); } catch { /* ignore */ }
          throw new Error(`AI API ${res.status} ${res.statusText}: ${errBody}`);
        }

        const data = await res.json();
        const raw: string = data?.choices?.[0]?.message?.content ?? "";
        if (!raw) throw new Error("AI returned empty content");

        const parsed = parseAIJsonResponse(raw);

        // Build preview from the generated code if AI didn't provide one
        if (!parsed.preview || parsed.preview.trim().length < 50) {
          // Prefer the main page file; fall back to `code` field or first file
          const mainFile =
            parsed.files?.["src/app/page.tsx"] ??
            parsed.files?.["src/pages/index.tsx"] ??
            parsed.code ??
            (parsed.files ? Object.values(parsed.files)[0] : "") ??
            "";
          parsed.preview = buildPreviewHTML("AI Preview", mainFile);
        }
        if (!parsed.type) parsed.type = "code_update";
        // Ensure code field is always populated for the editor
        if (!parsed.code && parsed.files) {
          parsed.code =
            parsed.files["src/app/page.tsx"] ??
            parsed.files["src/pages/index.tsx"] ??
            Object.values(parsed.files)[0] ??
            "";
        }
        return parsed;
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Unknown AI error");
        lastError = err;
        console.error(`[chat] AI call attempt failed (model=${modelName}):`, err.message);
      }
    }
  }

  throw lastError || new Error("AI provider call failed");
}

// ─────────────────────────────────────────────
// POST /api/chat
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const plan =
      ((session?.user as Record<string, unknown> | undefined)?.plan as string | undefined) || "free";
    const userId =
      session?.user?.email || req.headers.get("x-user-id") || extractClientIp(req.headers.get("x-forwarded-for"));

    const requestLimit = getPlanRequestLimit(plan, 10, 50);
    const requestRate = await incrementRateLimit({
      key: `rate_limit:${userId}`,
      limit: requestLimit,
      windowSeconds: 60,
    });
    if (!requestRate.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before sending more requests." },
        { status: 429 }
      );
    }

    const body = (await req.json()) as ChatRequestBody;
    const userMessage = body.message || body.prompt || "";
    const projectId = body.projectId;

    if (!userMessage.trim() && !body.messages?.length) {
      return NextResponse.json({ error: "message or prompt is required" }, { status: 400 });
    }

    // Build conversation — filter out empty / streaming messages
    const conversationMessages: { role: string; content: string }[] = body.messages
      ? body.messages
          .filter((m) => m.content && m.content.trim().length > 0)
          .map((m) => ({ role: m.role, content: m.content }))
      : [{ role: "user", content: userMessage }];

    // Ensure latest user message is at the end
    const lastMsg = conversationMessages[conversationMessages.length - 1];
    if (!lastMsg || lastMsg.role !== "user") {
      if (userMessage.trim()) conversationMessages.push({ role: "user", content: userMessage });
    }

    // Expand first-time website creation prompts with richer design/build requirements.
    if (shouldExpandPrompt(conversationMessages)) {
      const latest = conversationMessages[conversationMessages.length - 1];
      if (latest && latest.role === "user" && latest.content.trim()) {
        latest.content = buildExpandedCreationPrompt(latest.content);
      }
    }

    // Append project context to final user message
    if (body.projectContext && conversationMessages.length > 0) {
      const ctx = body.projectContext;
      const note = ctx.currentFile ? `\n\n[Currently editing: ${ctx.currentFile}]` : "";
      const existingFilesList = ctx.files ? `\n\n[EXISTING PROJECT FILES DO NOT DELETE]:\n${Object.keys(ctx.files).join('\n')}\n[Note: When generating a component inside an existing page, DO NOT delete the existing imported tags inside the layout.]` : "";
      
      const last = conversationMessages[conversationMessages.length - 1];
      if (last.role === "user") last.content += note + existingFilesList;
    }

    // ── Check generation limits ──────────────────────────────
    if (session && session.user?.email) {
      await connectToDatabase();
      const genCheck = await checkAndIncrementGeneration(session.user.email);
      
      if (!genCheck.allowed) {
        return NextResponse.json({
          type: "message_only",
          reply: "You have reached the daily limit of 5 generations. Upgrade to Pro for unlimited usage.",
          limitReached: true,
          remaining: 0,
          plan: genCheck.plan,
        });
      }
    }

    // ── Try real AI ──────────────────────────────────────────
    const { apiKey, baseURL, model } = getAIConfig();

    let result: ChatResponse;

    if (apiKey) {
      try {
        console.log(`[chat] → ${model} (${conversationMessages.length} msg)`);
        result = await callAIModel(conversationMessages, apiKey, baseURL, model);
        console.log(`[chat] ✓ type=${result.type} files=${Object.keys(result.files ?? {}).join(", ")}`);
      } catch (aiErr) {
        const reason = aiErr instanceof Error ? aiErr.message : "Unknown provider error";
        const useLocalFallback = process.env.AI_ENABLE_LOCAL_FALLBACK === "true";
        if (useLocalFallback) {
          console.error("[chat] AI failed, using local fallback:", reason);
          result = localGenerate(conversationMessages[conversationMessages.length - 1]?.content ?? userMessage);
        } else {
          return NextResponse.json(
            {
              type: "message_only",
              reply: `AI provider failed: ${reason}. Please check your OpenRouter model/key/credits and try again.`,
            },
            { status: 502 }
          );
        }
      }
    } else {
      return NextResponse.json(
        {
          type: "message_only",
          reply: "AI provider key is missing. Set OPENROUTER_API_KEY and try again.",
        },
        { status: 500 }
      );
    }

    // Save chat history and generated state to DB if user is logged in
    if (session && session.user?.email) {
      await connectToDatabase();

      let projectDoc: { _id: string; name: string } | null = null;
      if (projectId) {
        const user = await User.findOne({ email: session.user.email }).select("_id").lean();
        if (user?._id) {
          projectDoc = await Project.findOne({
            _id: projectId,
            userId: user._id,
            status: "active",
          })
            .select("_id name")
            .lean();
        }
      }
      
      // Save User Message
      if (userMessage.trim()) {
        await ChatMessage.create({
          userEmail: session.user.email,
          projectId: projectDoc?._id,
          role: 'user',
          content: userMessage,
        });
      }

      // Save AI Response
      await ChatMessage.create({
        userEmail: session.user.email,
        projectId: projectDoc?._id,
        role: 'ai',
        content: result.reply || "Done!",
        code: result.code,
        filename: result.filename,
      });

      // Persist generated files for this project.
      if (projectDoc?._id && result.files && Object.keys(result.files).length > 0) {
        const updates = Object.entries(result.files).map(([path, content]) =>
          FileModel.updateOne(
            { projectId: projectDoc._id, path },
            { $set: { content, updatedAt: new Date() } },
            { upsert: true }
          )
        );
        await Promise.all(updates);

        const allFiles = await FileModel.find({ projectId: projectDoc._id }).lean();
        const filesSnapshot = Object.fromEntries(allFiles.map((f) => [f.path, f.content]));
        const latestVersion = await Version.findOne({ projectId: projectDoc._id })
          .sort({ versionNumber: -1 })
          .lean();

        await Version.create({
          projectId: projectDoc._id,
          versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
          description: userMessage.trim() || "AI update",
          filesSnapshot,
          createdAt: new Date(),
        });
      }

      // Keep project metadata fresh and auto-name after the first prompt.
      if (projectDoc?._id) {
        const projectUpdate: Record<string, unknown> = {
          updatedAt: new Date(),
        };

        if (typeof result.preview === "string") {
          projectUpdate.previewHTML = result.preview;
        }

        const isTemporaryName = projectDoc.name === "New Project" || /^Project\s+\d+$/i.test(projectDoc.name);
        if (isTemporaryName && userMessage.trim()) {
          projectUpdate.name = await generateProjectName(userMessage);
        }

        await Project.updateOne({ _id: projectDoc._id }, { $set: projectUpdate });
      }
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("/api/chat error:", err);
    return NextResponse.json(
      { type: "message_only", reply: "Something went wrong. Please try again.", error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
