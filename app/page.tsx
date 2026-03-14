"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Sparkles, Code2, Eye, Rocket, MessageSquare, Zap, ChevronDown,
  Layout, Palette, Globe, Terminal, BookTemplate, ArrowRight,
  Star, Play, Check,
} from "lucide-react";
import { useBuilderStore } from "@/store/useBuilderStore";
import Navbar from "@/components/Navbar";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import Link from "next/link";

// ─── Data ─────────────────────────────────────────────────────────────────
const EXAMPLE_PROMPTS = [
  "Create a SaaS landing page",
  "Build a portfolio website",
  "Generate a blog homepage",
  "Make a startup landing page",
];

const FEATURES = [
  { icon: Sparkles, title: "AI Website Generation", desc: "Create complete websites using simple prompts. Our AI understands context and builds production-ready code." },
  { icon: Eye, title: "Live Preview", desc: "Instantly preview generated websites in real-time. See changes as the AI builds your vision." },
  { icon: MessageSquare, title: "Chat-Based Editing", desc: "Modify your website using natural language. Just describe the changes and watch them happen." },
  { icon: Code2, title: "Code Editor", desc: "View and edit generated code using a built-in Monaco editor with syntax highlighting." },
  { icon: Rocket, title: "One-Click Deployment", desc: "Deploy your website instantly to Vercel or AWS with a single click. Go live in seconds." },
  { icon: BookTemplate, title: "Template Library", desc: "Start from professionally designed templates. Portfolio, SaaS, blog, and more." },
];

const STEPS = [
  {
    step: "01",
    title: "Enter a Prompt",
    desc: "Describe your website idea in plain English. Our AI understands complex requirements.",
    example: '"Create a portfolio website with dark theme"',
    color: "from-blue-600 to-blue-400",
  },
  {
    step: "02",
    title: "AI Generates Your Site",
    desc: "Components, layout, and code are generated automatically using advanced AI models.",
    example: "React + Tailwind + TypeScript",
    color: "from-purple-600 to-purple-400",
  },
  {
    step: "03",
    title: "Preview & Deploy",
    desc: "Preview your website in real-time and deploy instantly to production hosting.",
    example: "Live on yoursite.vercel.app",
    color: "from-emerald-600 to-emerald-400",
  },
];

const TEMPLATES = [
  { name: "Portfolio Website", desc: "Showcase your work with a stunning personal portfolio.", img: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=600&h=400&fit=crop", prompt: "Build a modern portfolio website with project gallery and about section" },
  { name: "Startup Landing Page", desc: "Convert visitors into customers with a high-impact landing page.", img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop", prompt: "Create a startup landing page with hero, features, and pricing" },
  { name: "Blog Website", desc: "Start your blog with a clean, readable design.", img: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&h=400&fit=crop", prompt: "Generate a blog homepage with featured posts and sidebar" },
  { name: "E-commerce Store", desc: "Sell products online with a professional storefront.", img: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop", prompt: "Build an e-commerce store with product grid and cart" },
  { name: "Agency Website", desc: "Present your agency with credibility and style.", img: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop", prompt: "Create a digital agency website with services and team section" },
  { name: "Dashboard UI", desc: "Build admin panels and analytics dashboards.", img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop", prompt: "Create a SaaS analytics dashboard with charts and stats" },
];

const TESTIMONIALS = [
  { name: "Sarah K.", role: "CTO at DevCorp", text: "This platform 10x'd our prototyping speed. What used to take days now takes minutes.", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" },
  { name: "Mike R.", role: "Founder, Launchify", text: "Went from idea to deployed SaaS in 48 hours. The AI understands context perfectly.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" },
  { name: "Emma L.", role: "Lead Dev at Nexus", text: "The generated code is clean, production-quality React. I was genuinely impressed.", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop" },
];

const FAQS = [
  { q: "How does the AI website builder work?", a: "Simply enter a natural language prompt describing the website you want. Our AI analyzes the prompt, generates React + Tailwind CSS components, and renders a live preview. You can then refine the output using chat-based editing." },
  { q: "Can I edit the generated code?", a: "Yes! The built-in code editor lets you view and modify all generated code. You have full control over the components, styling, and logic." },
  { q: "Is there a free plan available?", a: "Yes, the free plan includes 5 AI generations per day. Upgrade to Pro for unlimited generations, faster AI responses, and deployment support." },
  { q: "Can I deploy my website?", a: "Absolutely. Use our one-click deployment to push your generated website to Vercel or AWS. Pro users get priority deployment and custom domain support." },
  { q: "What technologies are used?", a: "Generated websites use Next.js, React, TypeScript, and Tailwind CSS — all modern, production-grade technologies with excellent community support." },
];

const TRUSTED_LOGOS = ["Google", "Microsoft", "Amazon", "Netflix", "Stripe", "Vercel"];

// ─── Component ────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { setPrompt, setProjectName } = useBuilderStore();
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const startNewProject = async (userPrompt: string) => {
    if (!userPrompt.trim()) return;
    if (status === "unauthenticated") {
      toast.error("Please login to create a website.", {
        style: { borderRadius: "10px", background: "#1e293b", color: "#fff" },
      });
      router.push("/login");
      return;
    }
    setIsLoading(true);

    // Clear local builder store state to guarantee a fresh chat UI
    const store = useBuilderStore.getState();
    store.clearMessages();
    store.updateFiles({});
    store.updatePreview("");
    store.setFileTree([]);
    store.setActiveFile("");

    // Instruct the backend to clear existing session messages
    try {
      await fetch("/api/messages", { method: "DELETE" });
    } catch (e) {
      console.error("Failed to clear chat context", e);
    }

    setPrompt(userPrompt.trim());
    setProjectName(userPrompt.trim().slice(0, 40) + (userPrompt.length > 40 ? "..." : ""));
    router.push("/builder");
  };

  const handleGenerate = () => startNewProject(inputValue);
  const handleTemplateClick = (prompt: string) => startNewProject(prompt);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleGenerate();
  };

  return (
    <div className="min-h-screen bg-[#0a0b14] text-slate-100 relative overflow-x-hidden">
      {/* Background decor */}
      <div className="fixed inset-0 grid-bg pointer-events-none" />
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full pointer-events-none glow-orb" style={{ background: "#2547f4" }} />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full pointer-events-none glow-orb" style={{ background: "#7c3aed" }} />

      {/* ── NAVBAR ──────────────────────────────────────────── */}
      <Navbar />

      <div className="relative flex flex-col items-center">

        {/* ═══════════════════════════════════════════════════════
            HERO SECTION
        ═══════════════════════════════════════════════════════ */}
        <main className="w-full max-w-7xl px-6 pt-28 pb-32 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2547f4]/10 border border-[#2547f4]/20 text-[#2547f4] text-xs font-bold mb-8 tracking-widest uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2547f4] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2547f4]" />
            </span>
            Introducing Agentic v2.0
          </div>

          <h1
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl leading-tight"
            style={{
              background: "linear-gradient(180deg, #ffffff 0%, #94a3b8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Build Websites with AI
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-14 font-medium leading-relaxed">
            Experience the future of web development. Turn your ideas into production-ready websites in seconds using agentic AI.
          </p>

          {/* Prompt Box */}
          <div className="w-full max-w-3xl relative group animate-fade-in-up">
            <div className="absolute -inset-1 bg-linear-to-r from-[#2547f4]/50 to-purple-600/50 rounded-2xl blur opacity-25 group-focus-within:opacity-60 transition duration-1000" />
            <div className="relative flex flex-col md:flex-row items-center gap-2 p-2 bg-slate-900/80 border border-[#222949] rounded-2xl backdrop-blur-xl">
              <div className="flex-1 flex items-center px-4 w-full">
                <Sparkles className="text-slate-500 mr-3 w-5 h-5 shrink-0" />
                <input
                  id="prompt-input"
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe the website you want to build..."
                  className="w-full bg-transparent border-none outline-none text-slate-100 placeholder:text-slate-500 py-3 text-lg"
                  autoComplete="off"
                />
              </div>
              <button
                id="generate-btn"
                onClick={handleGenerate}
                disabled={isLoading || !inputValue.trim()}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#2547f4] hover:bg-blue-600 disabled:opacity-50 text-white px-8 py-3.5 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-600/20"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Example Prompts */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => setInputValue(prompt)}
                className="px-4 py-2 rounded-full bg-slate-800/50 border border-[#222949] text-sm text-slate-400 hover:border-[#2547f4]/50 hover:text-[#2547f4] transition-all"
              >
                "{prompt}"
              </button>
            ))}
          </div>
        </main>

        {/* ═══════════════════════════════════════════════════════
            TRUSTED BY LOGOS
        ═══════════════════════════════════════════════════════ */}
        <section className="w-full max-w-5xl px-6 pb-24">
          <p className="text-center text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-8">
            Trusted by teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16 opacity-40">
            {TRUSTED_LOGOS.map((name) => (
              <span key={name} className="text-xl font-bold text-slate-400 tracking-tight">
                {name}
              </span>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            FEATURES SECTION
        ═══════════════════════════════════════════════════════ */}
        <section id="features" className="w-full max-w-7xl px-6 pb-32">
          <div className="text-center mb-16">
            <p className="text-[#2547f4] text-sm font-bold uppercase tracking-widest mb-4">Features</p>
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{
                background: "linear-gradient(180deg, #ffffff 0%, #94a3b8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Powerful AI Website Builder Features
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Everything you need to design, build, and ship production-ready websites.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group p-8 rounded-2xl bg-slate-900/40 border border-[#222949] hover:bg-slate-900/60 hover:border-[#2547f4]/30 transition-all hover:-translate-y-1 duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#2547f4]/10 border border-[#2547f4]/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#2547f4]/20 transition-all">
                  <Icon className="text-[#2547f4] w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-[#2547f4] transition-colors">{title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            HOW IT WORKS
        ═══════════════════════════════════════════════════════ */}
        <section className="w-full max-w-6xl px-6 pb-32">
          <div className="text-center mb-16">
            <p className="text-purple-400 text-sm font-bold uppercase tracking-widest mb-4">How It Works</p>
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{
                background: "linear-gradient(180deg, #ffffff 0%, #94a3b8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Build Your Website in 3 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-24 left-[20%] right-[20%] h-px bg-linear-to-r from-blue-600/50 via-purple-600/50 to-emerald-600/50" />

            {STEPS.map((s, i) => (
              <div key={i} className="relative group">
                <div className="p-8 rounded-2xl bg-slate-900/40 border border-[#222949] hover:border-slate-700 transition-all text-center h-full">
                  <div className={`w-16 h-16 rounded-2xl bg-linear-to-br ${s.color} flex items-center justify-center text-2xl font-black text-white mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                    {s.step}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-4">{s.desc}</p>
                  <code className="inline-block px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-slate-300 font-mono">
                    {s.example}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            PRODUCT DEMO
        ═══════════════════════════════════════════════════════ */}
        <section className="w-full max-w-6xl px-6 pb-32">
          <div className="text-center mb-12">
            <p className="text-emerald-400 text-sm font-bold uppercase tracking-widest mb-4">Live Demo</p>
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{
                background: "linear-gradient(180deg, #ffffff 0%, #94a3b8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              See AI Website Builder in Action
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Watch how a single prompt transforms into a fully-functional website.
            </p>
          </div>

          <div className="relative rounded-3xl overflow-hidden border border-[#222949] bg-slate-900 p-2 shadow-2xl">
            {/* Browser chrome */}
            <div className="flex items-center h-10 bg-slate-800/50 px-4 gap-2 rounded-t-2xl">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
              </div>
              <div className="flex-1 max-w-sm mx-auto h-6 bg-slate-900/60 rounded flex items-center justify-center text-[10px] text-slate-500">
                agentic-preview.vercel.app
              </div>
            </div>
            {/* Fake preview */}
            <div className="aspect-video bg-[#0a0b14] flex flex-col overflow-hidden rounded-b-2xl">
              <div className="flex items-center justify-between px-8 py-4 border-b border-[#222949]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#2547f4] rounded-md" />
                  <span className="text-slate-200 font-bold text-sm">QuantumSaaS</span>
                </div>
                <div className="flex gap-5 text-slate-500 text-xs">
                  <span>Features</span><span>Pricing</span><span>About</span>
                </div>
                <div className="bg-[#2547f4] text-white px-4 py-1.5 rounded-lg text-xs font-bold">Get Started</div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="inline-block px-3 py-1 rounded-full border border-[#2547f4]/30 bg-[#2547f4]/10 text-[#2547f4] text-[10px] font-bold mb-5">
                  NEW v2.0 RELEASE
                </div>
                <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
                  Scale your agency with{" "}
                  <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(to right, #2547f4, #60a5fa)" }}>
                    intelligent automation
                  </span>
                </h2>
                <p className="text-slate-400 max-w-md mb-8 text-sm leading-relaxed">
                  The only AI-powered platform to build and deploy complex SaaS applications in record time.
                </p>
                <div className="flex gap-4">
                  <button className="bg-[#2547f4] text-white px-6 py-2 rounded-xl font-bold text-sm">Start Building</button>
                  <button className="border border-[#222949] text-white px-6 py-2 rounded-xl font-bold text-sm">Watch Demo</button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <button
              onClick={() => {
                setInputValue("Create a SaaS landing page with pricing and testimonials");
              }}
              className="flex items-center gap-2 px-6 py-3 bg-[#2547f4]/10 border border-[#2547f4]/30 text-[#2547f4] hover:bg-[#2547f4] hover:text-white rounded-xl font-bold text-sm transition-all"
            >
              <Play className="w-4 h-4" /> Try Demo Prompt
            </button>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            TEMPLATE MARKETPLACE
        ═══════════════════════════════════════════════════════ */}
        <section className="w-full max-w-7xl px-6 pb-32">
          <div className="text-center mb-16">
            <p className="text-amber-400 text-sm font-bold uppercase tracking-widest mb-4">Templates</p>
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{
                background: "linear-gradient(180deg, #ffffff 0%, #94a3b8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Start With Beautiful Templates
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Kickstart your project with professionally designed templates, fully customizable with AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEMPLATES.map((t) => (
              <div
                key={t.name}
                className="group rounded-2xl bg-slate-900/40 border border-[#222949] overflow-hidden hover:border-[#2547f4]/30 transition-all hover:-translate-y-1 duration-300"
              >
                <div className="relative overflow-hidden h-48">
                  <img
                    src={t.img}
                    alt={t.name}
                    width={600}
                    height={400}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-[#0a0b14] via-transparent to-transparent" />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold mb-2 group-hover:text-[#2547f4] transition-colors">{t.name}</h3>
                  <p className="text-slate-400 text-sm mb-4 leading-relaxed">{t.desc}</p>
                  <button
                    onClick={() => handleTemplateClick(t.prompt)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 border border-slate-700 hover:bg-[#2547f4] hover:border-[#2547f4] hover:text-white text-slate-300 rounded-lg text-xs font-bold transition-all"
                  >
                    Use Template <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            TESTIMONIALS
        ═══════════════════════════════════════════════════════ */}
        <section className="w-full max-w-6xl px-6 pb-32">
          <div className="text-center mb-16">
            <p className="text-pink-400 text-sm font-bold uppercase tracking-widest mb-4">Testimonials</p>
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{
                background: "linear-gradient(180deg, #ffffff 0%, #94a3b8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Loved by Developers
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Join thousands of developers who transformed their workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((r) => (
              <div key={r.name} className="p-8 rounded-2xl border border-[#222949] bg-slate-900/40 hover:border-[#2547f4]/20 transition-all">
                <div className="flex gap-1 mb-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-300 text-lg leading-relaxed mb-8">"{r.text}"</p>
                <div className="flex items-center gap-3">
                  <img src={r.avatar} alt={r.name} width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="font-bold text-sm">{r.name}</p>
                    <p className="text-slate-400 text-xs">{r.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            PRICING (link to /pricing)
        ═══════════════════════════════════════════════════════ */}
        <section className="w-full max-w-4xl px-6 pb-32">
          <div className="text-center mb-12">
            <p className="text-emerald-400 text-sm font-bold uppercase tracking-widest mb-4">Pricing</p>
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{
                background: "linear-gradient(180deg, #ffffff 0%, #94a3b8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Simple, Transparent Pricing
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="p-8 rounded-2xl border border-[#222949] bg-slate-900/40">
              <h3 className="text-xl font-bold mb-2">Free</h3>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-black">₹0</span>
                <span className="text-slate-400 mb-1">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["5 AI generations/day", "Basic templates", "Code editor", "Community support"].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="block w-full py-3 text-center border border-slate-700 hover:border-[#2547f4]/40 rounded-xl text-sm font-semibold text-slate-300 transition-all">
                Get Started Free
              </Link>
            </div>

            {/* Pro */}
            <div className="p-8 rounded-2xl border border-[#2547f4]/40 bg-[#2547f4]/5 ring-1 ring-[#2547f4]/20 relative">
              <span className="absolute -top-3 left-6 px-3 py-1 bg-[#2547f4] text-xs font-bold rounded-full">MOST POPULAR</span>
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-black">₹499</span>
                <span className="text-slate-400 mb-1">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Unlimited AI generations", "All premium templates", "One-click deployment", "Priority support", "Custom domains"].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-[#2547f4] shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/pricing" className="block w-full py-3 text-center bg-[#2547f4] hover:bg-blue-600 rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all">
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            PROMPT EXAMPLES SECTION
        ═══════════════════════════════════════════════════════ */}
        <section className="w-full max-w-5xl px-6 pb-32">
          <div className="text-center mb-12">
            <p className="text-cyan-400 text-sm font-bold uppercase tracking-widest mb-4">Prompt Examples</p>
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{
                background: "linear-gradient(180deg, #ffffff 0%, #94a3b8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              See What You Can Build
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { prompt: "Create a SaaS landing page", icon: "🚀", desc: "Hero, features, pricing, and CTA sections" },
              { prompt: "Build a portfolio website", icon: "🎨", desc: "Projects gallery, skills, and contact form" },
              { prompt: "Generate a blog homepage", icon: "📝", desc: "Featured posts, categories, and newsletter" },
              { prompt: "Make a startup landing page", icon: "💡", desc: "Problem-solution, team, and investor CTA" },
            ].map((ex) => (
              <button
                key={ex.prompt}
                onClick={() => {
                  setInputValue(ex.prompt);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex items-start gap-4 p-6 rounded-2xl border border-[#222949] bg-slate-900/40 hover:border-[#2547f4]/30 hover:bg-slate-900/60 transition-all text-left group"
              >
                <span className="text-3xl shrink-0">{ex.icon}</span>
                <div>
                  <h3 className="font-bold text-lg mb-1 group-hover:text-[#2547f4] transition-colors">"{ex.prompt}"</h3>
                  <p className="text-slate-400 text-sm">{ex.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            FAQ
        ═══════════════════════════════════════════════════════ */}
        <section className="w-full max-w-3xl px-6 pb-32">
          <div className="text-center mb-16">
            <p className="text-orange-400 text-sm font-bold uppercase tracking-widest mb-4">FAQ</p>
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{
                background: "linear-gradient(180deg, #ffffff 0%, #94a3b8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="rounded-2xl border border-[#222949] bg-slate-900/40 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left group"
                >
                  <span className="font-bold text-lg pr-4 group-hover:text-[#2547f4] transition-colors">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${openFaq === i ? "rotate-180 text-[#2547f4]" : ""}`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openFaq === i ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="px-6 pb-6 text-slate-400 leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            CALL TO ACTION
        ═══════════════════════════════════════════════════════ */}
        <section className="w-full max-w-5xl px-6 pb-32">
          <div className="relative rounded-3xl overflow-hidden p-12 md:p-20 text-center">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-linear-to-br from-[#2547f4]/20 via-purple-600/10 to-[#0a0b14] border border-[#2547f4]/20 rounded-3xl" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#2547f4]/20 rounded-full blur-[120px]" />

            <div className="relative">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Start Building Your{" "}
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(to right, #2547f4, #a78bfa)" }}>
                  Website with AI
                </span>
              </h2>
              <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
                Generate beautiful websites instantly using simple prompts. No design skills required.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/builder"
                  className="flex items-center gap-2 px-10 py-4 bg-[#2547f4] hover:bg-blue-600 rounded-2xl font-bold text-lg shadow-2xl shadow-blue-600/30 hover:scale-[1.02] transition-all"
                >
                  Start Building <ArrowRight className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => {
                    const el = document.getElementById("features");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="px-10 py-4 border border-slate-700 hover:border-[#2547f4]/40 rounded-2xl font-bold text-lg text-slate-300 transition-all"
                >
                  View Templates
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            FOOTER
        ═══════════════════════════════════════════════════════ */}
        <footer className="w-full max-w-7xl px-6 py-16 border-t border-[#222949]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="text-[#2547f4] w-5 h-5" />
                <span className="font-bold text-lg text-white">Agentic AI</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                The AI-powered website builder that turns your ideas into production-ready websites.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-bold text-sm mb-4 text-slate-200 uppercase tracking-wider">Product</h4>
              <ul className="space-y-2">
                {["Builder", "Templates", "Pricing", "Changelog"].map((l) => (
                  <li key={l}><a href="#" className="text-sm text-slate-400 hover:text-[#2547f4] transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-bold text-sm mb-4 text-slate-200 uppercase tracking-wider">Company</h4>
              <ul className="space-y-2">
                {["About", "Blog", "Careers", "Contact"].map((l) => (
                  <li key={l}><a href="#" className="text-sm text-slate-400 hover:text-[#2547f4] transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-bold text-sm mb-4 text-slate-200 uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2">
                {["Privacy", "Terms", "Security", "GDPR"].map((l) => (
                  <li key={l}><a href="#" className="text-sm text-slate-400 hover:text-[#2547f4] transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-[#222949] text-sm text-slate-500">
            <span>© 2024 Agentic AI. Built with Intelligence.</span>
            <div className="flex items-center gap-6">
              {["Twitter", "GitHub", "Discord", "LinkedIn"].map((link) => (
                <a key={link} href="#" className="hover:text-[#2547f4] transition-colors">{link}</a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
