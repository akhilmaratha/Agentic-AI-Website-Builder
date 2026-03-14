"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles, Code2, Eye, Rocket, MessageSquare, Zap } from "lucide-react";
import { useBuilderStore } from "@/store/useBuilderStore";
import Navbar from "@/components/Navbar";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

const EXAMPLE_PROMPTS = [
  "A minimalist portfolio for a designer",
  "E-commerce store for premium coffee",
  "SaaS dashboard with dark mode",
  "Landing page for a mobile app",
];

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { setPrompt, setProjectName } = useBuilderStore();
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = () => {
    if (!inputValue.trim()) return;
    
    // Auth Check
    if (status === "unauthenticated") {
      toast.error("Please login to create a website.", {
        style: {
          borderRadius: "10px",
          background: "#1e293b",
          color: "#fff",
        },
      });
      router.push("/login");
      return;
    }

    setIsLoading(true);
    setPrompt(inputValue.trim());
    setProjectName(inputValue.trim().slice(0, 40) + (inputValue.length > 40 ? "..." : ""));
    setTimeout(() => router.push("/builder"), 400);
  };

  const handleExampleClick = (prompt: string) => {
    setInputValue(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleGenerate();
  };

  return (
    <div className="min-h-screen bg-[#0a0b14] text-slate-100 relative overflow-x-hidden">
      {/* Background decor */}
      <div className="fixed inset-0 grid-bg pointer-events-none" />
      <div
        className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full pointer-events-none glow-orb"
        style={{ background: "#2547f4" }}
      />
      <div
        className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full pointer-events-none glow-orb"
        style={{ background: "#7c3aed" }}
      />

      {/* NAVBAR */}
      <Navbar />

      <div className="relative flex flex-col items-center">
        {/* HERO */}
        <main className="w-full max-w-7xl px-6 pt-28 pb-32 flex flex-col items-center text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2547f4]/10 border border-[#2547f4]/20 text-[#2547f4] text-xs font-bold mb-8 tracking-widest uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2547f4] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2547f4]" />
            </span>
            Introducing Agentic v2.0
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl leading-tight"
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

          {/* PROMPT BOX */}
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

          {/* EXAMPLE PROMPTS */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleExampleClick(prompt)}
                className="px-4 py-2 rounded-full bg-slate-800/50 border border-[#222949] text-sm text-slate-400 hover:border-[#2547f4]/50 hover:text-[#2547f4] transition-all"
              >
                "{prompt}"
              </button>
            ))}
          </div>
        </main>

        {/* FEATURES GRID */}
        <section className="w-full max-w-7xl px-6 pb-40">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Code2, title: "AI Code Generation", desc: "Clean Next.js and Tailwind code generated instantly with best practices." },
              { icon: Eye, title: "Live Preview", desc: "See changes in real-time as the AI builds and refines your components." },
              { icon: Rocket, title: "Deploy Instantly", desc: "One-click deployment to global edge networks. Ready for production." },
              { icon: MessageSquare, title: "Edit with Chat", desc: "Refine your design naturally using our conversational AI interface." },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group p-8 rounded-2xl bg-slate-900/40 border border-[#222949] hover:bg-slate-900/60 hover:border-[#2547f4]/30 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-[#2547f4]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Icon className="text-[#2547f4] w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">{title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PREVIEW SECTION */}
        <section className="w-full max-w-6xl px-6 pb-40">
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
              {/* Fake nav */}
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
              {/* Fake hero */}
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="inline-block px-3 py-1 rounded-full border border-[#2547f4]/30 bg-[#2547f4]/10 text-[#2547f4] text-[10px] font-bold mb-5">
                  NEW v2.0 RELEASE
                </div>
                <h2 className="text-3xl font-bold text-white mb-4 leading-tight">Scale your agency with{" "}
                  <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(to right, #2547f4, #60a5fa)" }}>
                    intelligent automation
                  </span>
                </h2>
                <p className="text-slate-400 max-w-md mb-8 text-sm leading-relaxed">
                  The only AI-powered platform designed to build and deploy complex SaaS applications in record time.
                </p>
                <div className="flex gap-4">
                  <button className="bg-[#2547f4] text-white px-6 py-2 rounded-xl font-bold text-sm">Start Building</button>
                  <button className="border border-[#222949] text-white px-6 py-2 rounded-xl font-bold text-sm">Watch Demo</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="w-full max-w-7xl px-6 py-12 border-t border-[#222949] flex flex-col md:flex-row items-center justify-between gap-6 text-slate-500 text-sm">
          <div className="flex items-center gap-2">
            <Zap className="text-[#2547f4] w-5 h-5" />
            <span className="font-bold text-slate-200">Agentic AI</span>
            <span className="ml-2">© 2024 Built with Intelligence.</span>
          </div>
          <div className="flex items-center gap-8">
            {["Twitter", "GitHub", "Discord", "Privacy"].map((link) => (
              <a key={link} href="#" className="hover:text-[#2547f4] transition-colors">
                {link}
              </a>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
