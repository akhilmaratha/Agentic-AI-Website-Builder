"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Zap, ChevronDown, User, Layers, CreditCard, LogOut } from "lucide-react";
import Image from "next/image";

export default function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogin = () => router.push("/login");
  const handleSignUp = () => router.push("/login");

  return (
    <header className="w-full px-6 py-4 flex items-center justify-between border-b border-[#222949] sticky top-0 z-50 bg-[#0a0b14]/80 backdrop-blur-xl">
      <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
        
        {/* Left side: Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => router.push("/")}
        >
          <div className="bg-[#2547f4] p-2 rounded-xl flex items-center justify-center group-hover:bg-blue-600 transition-colors">
            <Zap className="text-white w-5 h-5 group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white hover:text-slate-200 transition-colors">
            Agentic AI
          </span>
        </div>

        {/* Center: Nav links */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: "Home", href: "/" },
            { label: "Features", href: "/#features" },
            { label: "Pricing", href: "/pricing" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`text-sm font-medium transition-colors ${
                pathname === item.href 
                  ? "text-[#2547f4]" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right side: Auth Actions */}
        <div className="flex items-center gap-3">
          {status === "loading" ? (
            <div className="w-24 h-10 animate-pulse bg-slate-800 rounded-xl" />
          ) : session ? (
             <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 p-1 pl-3 pr-2 rounded-full border border-slate-700 bg-slate-800/50 hover:bg-slate-700 transition-colors focus:ring-2 focus:ring-[#2547f4]"
                >
                  <span className="text-sm font-medium text-slate-200 hidden md:block">
                    {session.user?.name || "User"}
                  </span>
                  {session.user?.image ? (
                    <Image 
                      src={session.user.image} 
                      alt="Avatar" 
                      width={32} 
                      height={32} 
                      className="rounded-full bg-slate-600"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      {(session.user?.name || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-700 bg-slate-800 shadow-xl overflow-hidden py-1 z-50 animate-fade-in-up origin-top-right">
                    <div className="px-4 py-3 border-b border-slate-700">
                      <p className="text-sm text-white font-medium truncate">{session.user?.name}</p>
                      <p className="text-xs text-slate-400 truncate">{session.user?.email}</p>
                    </div>
                    
                    <button onClick={() => router.push("/dashboard")} className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700 flex items-center gap-3 transition-colors">
                      <User className="w-4 h-4" /> Dashboard
                    </button>
                    <button onClick={() => router.push("/projects")} className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700 flex items-center gap-3 transition-colors">
                      <Layers className="w-4 h-4" /> My Projects
                    </button>
                    <button onClick={() => router.push("/billing")} className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700 flex items-center gap-3 transition-colors">
                      <CreditCard className="w-4 h-4" /> Billing
                    </button>
                    
                    <div className="border-t border-slate-700 my-1"></div>
                    
                    <button onClick={() => signOut({ callbackUrl: '/' })} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-slate-700/50 flex items-center gap-3 transition-colors">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
             </div>
          ) : (
            <>
              <button 
                onClick={handleLogin}
                className="text-sm font-medium text-slate-400 hover:text-white px-4 py-2 transition-colors"
              >
                Login
              </button>
              <button
                onClick={handleSignUp}
                className="bg-[#2547f4] hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-600/20"
              >
                Sign Up
              </button>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
