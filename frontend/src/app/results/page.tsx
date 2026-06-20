"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import GapSummary from "@/components/GapSummary";
import Roadmap from "@/components/Roadmap";
import type { AnalysisResponse } from "@/lib/types";

// Dynamically import SkillGraph to avoid SSR issues with React Flow
const SkillGraph = dynamic(() => import("@/components/SkillGraph"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] rounded-xl skeleton" />
  ),
});

type Tab = "summary" | "graph" | "roadmap";

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("summary");

  useEffect(() => {
    const stored = sessionStorage.getItem("skillgraph_result");
    if (stored) {
      setResult(JSON.parse(stored));
    } else {
      router.push("/");
    }
  }, [router]);

  if (!result) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <div className="h-8 w-48 skeleton" />
          <div className="h-40 skeleton" />
          <div className="h-60 skeleton" />
        </div>
      </main>
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "summary", label: "Gap Analysis", icon: "📊" },
    { id: "graph", label: "Skill Graph", icon: "🕸️" },
    { id: "roadmap", label: "Roadmap", icon: "🗺️" },
  ];

  return (
    <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in-up">
        <div>
          <button
            onClick={() => router.push("/")}
            className="text-white/30 hover:text-white/60 text-sm mb-2 flex items-center gap-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-white">
            Results for{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              {result.role_requirements.role_title}
            </span>
          </h1>
          <p className="text-sm text-white/40 mt-1">
            {result.role_requirements.role_category} • {result.role_requirements.seniority}
          </p>
        </div>

        {/* Readiness badge */}
        <div className="text-center">
          <div
            className={`text-3xl font-bold ${
              result.gap.readiness_score >= 0.7
                ? "text-emerald-400"
                : result.gap.readiness_score >= 0.4
                ? "text-amber-400"
                : "text-red-400"
            }`}
          >
            {Math.round(result.gap.readiness_score * 100)}%
          </div>
          <div className="text-xs text-white/40">Ready</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6 animate-fade-in-up"
        style={{ animationDelay: "0.1s" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              flex items-center justify-center gap-2
              ${
                activeTab === tab.id
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "text-white/40 hover:text-white/60 hover:bg-white/5 border border-transparent"
              }
            `}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        className="animate-fade-in-up bg-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl p-6"
        style={{ animationDelay: "0.2s" }}
      >
        {activeTab === "summary" && (
          <GapSummary gap={result.gap} userSummary={result.user_summary} />
        )}
        {activeTab === "graph" && (
          <SkillGraph
            gap={result.gap}
            roleRequirements={result.role_requirements}
          />
        )}
        {activeTab === "roadmap" && <Roadmap roadmap={result.roadmap} />}
      </div>

      {/* Footer info */}
      <div className="mt-6 text-center text-xs text-white/20 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
        Analysis powered by Google Gemini • Your resume was not stored
      </div>
    </main>
  );
}
