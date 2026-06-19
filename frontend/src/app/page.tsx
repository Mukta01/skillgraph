"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ResumeUpload from "@/components/ResumeUpload";
import RoleSelector from "@/components/RoleSelector";
import { analyzeResume } from "@/lib/api";

export default function LandingPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = file && role && !isLoading;

  const handleAnalyze = async () => {
    if (!file || !role) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await analyzeResume(file, role);
      // Store result in sessionStorage for the results page
      sessionStorage.setItem("skillgraph_result", JSON.stringify(result));
      router.push("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-10 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse-dot" />
          AI-Powered Skill Analysis
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          Find your skill gaps.
          <br />
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            Get a roadmap.
          </span>
        </h1>
        <p className="text-white/50 text-lg max-w-md mx-auto">
          Upload your resume, pick your dream role, and see exactly what you
          need to learn — with a step-by-step plan.
        </p>
      </div>

      {/* Form Card */}
      <div
        className="w-full max-w-lg animate-fade-in-up glow"
        style={{ animationDelay: "0.15s" }}
      >
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
          {/* Step 1: Upload */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center">
                1
              </span>
              <span className="text-sm font-medium text-white/70">
                Upload your resume
              </span>
            </div>
            <ResumeUpload onFileSelect={setFile} selectedFile={file} />
          </div>

          {/* Step 2: Role */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center">
                2
              </span>
              <span className="text-sm font-medium text-white/70">
                Pick your target role
              </span>
            </div>
            <RoleSelector selectedRole={role} onRoleSelect={setRole} />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleAnalyze}
            disabled={!canSubmit}
            className={`
              w-full py-3.5 rounded-xl font-semibold text-sm
              transition-all duration-300
              ${
                canSubmit
                  ? "bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-400/30 active:scale-[0.98]"
                  : "bg-white/5 text-white/25 cursor-not-allowed"
              }
            `}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing with AI...
              </span>
            ) : (
              "Analyze My Skills"
            )}
          </button>

          <p className="text-center text-xs text-white/25">
            🔒 Your resume is processed in-memory and never stored.
          </p>
        </div>
      </div>

      {/* Features hint */}
      <div
        className="mt-12 grid grid-cols-3 gap-6 max-w-lg w-full animate-fade-in-up"
        style={{ animationDelay: "0.3s" }}
      >
        {[
          { icon: "📄", label: "Resume Parsing", desc: "PDF & DOCX" },
          { icon: "🎯", label: "Gap Analysis", desc: "AI-Powered" },
          { icon: "🗺️", label: "Roadmap", desc: "With Resources" },
        ].map((f) => (
          <div key={f.label} className="text-center">
            <div className="text-2xl mb-1">{f.icon}</div>
            <div className="text-xs font-medium text-white/50">{f.label}</div>
            <div className="text-[10px] text-white/25">{f.desc}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
