"use client";

export const dynamic = "force-dynamic";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useSession } from "next-auth/react";
import { Camera, Mail, Shield, Zap, Check } from "lucide-react";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: session?.user?.name || "",
    avatarUrl: session?.user?.image || "",
  });

  const handleSave = async () => {
    // In a real app this would call an API route to update the DB
    toast.success("Profile updated successfully!");
    setIsEditing(false);
    
    // Attempt to update NextAuth session locally
    await update({ 
      ...session,
      user: { ...session?.user, name: formData.name, image: formData.avatarUrl } 
    });
  };

  const plan = (session?.user as any)?.plan || "free";
  const initials = session?.user?.name?.[0]?.toUpperCase() || "U";

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold mb-1">My Profile</h2>
          <p className="text-slate-400">Manage your personal information and account settings.</p>
        </div>

        <div className="bg-[#0d0f1a] rounded-2xl border border-slate-800 p-8 shadow-xl">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4 shrink-0">
              <div className="relative group cursor-pointer">
                {formData.avatarUrl ? (
                  <img
                    src={formData.avatarUrl}
                    alt="Avatar"
                    className="w-32 h-32 rounded-full border-4 border-slate-800 object-cover shadow-2xl"
                  />
                ) : (
                  <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center font-bold text-5xl shadow-2xl border-4 border-slate-800">
                    {initials}
                  </div>
                )}
                {isEditing && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-slate-800 rounded-full border-2 border-[#0d0f1a] flex items-center justify-center shadow-lg">
                  {session?.user? (
                    <img src={`https://authjs.dev/img/providers/${(session.user as any).provider}.svg`} alt="Provider" className="w-5 h-5 grayscale opacity-70" onError={(e) => e.currentTarget.style.display = 'none'} />
                  ) : <Shield className="w-4 h-4 text-emerald-400" />}
                </div>
              </div>
              <div className="text-center">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${plan === 'pro' ? 'bg-linear-to-r from-blue-600 to-purple-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {plan === 'pro' && <Zap className="w-3 h-3" />} {plan} PLAN
                </span>
              </div>
            </div>

            {/* Info Form Section */}
            <div className="flex-1 w-full space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Personal Information</h3>
                {!isEditing ? (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setIsEditing(false); setFormData({ name: session?.user?.name || "", avatarUrl: session?.user?.image || "" }) }}
                      className="px-4 py-2 border border-slate-700 hover:border-slate-500 rounded-lg text-sm font-semibold transition-colors text-slate-300"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSave}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold shadow-lg shadow-blue-600/20 text-white transition-all flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" /> Save
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      disabled
                      value={session?.user?.email || ""}
                      className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-400 outline-none cursor-not-allowed opacity-70"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2 ml-1">Email is managed by your authentication provider ({(session?.user as any)?.provider || "OAuth"}).</p>
                </div>

                {isEditing && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Avatar URL (Optional)</label>
                    <input
                      type="url"
                      value={formData.avatarUrl}
                      onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-600 transition-colors"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0d0f1a] rounded-2xl border border-slate-800 p-8 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h3 className="text-xl font-bold mb-2">Account Security</h3>
            <p className="text-slate-400 text-sm">Your account was created on {new Date().toLocaleDateString()} via {(session?.user as any)?.provider || "Google"}.</p>
          </div>
          <button className="px-5 py-2.5 border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl text-sm font-bold transition-all">
            Delete Account
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
