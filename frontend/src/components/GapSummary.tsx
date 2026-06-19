"use client";

import type { GapResult, ExtractedSkill, SkillMatch } from "@/lib/types";

interface GapSummaryProps {
  gap: GapResult;
  userSummary: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  technical: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  soft: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  domain: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  tool: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  certification: "bg-pink-500/20 text-pink-300 border-pink-500/30",
};

export default function GapSummary({ gap, userSummary }: GapSummaryProps) {
  const percentage = Math.round(gap.readiness_score * 100);

  return (
    <div className="space-y-6">
      {/* Readiness Score */}
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            {/* Background circle */}
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="10"
            />
            {/* Progress circle */}
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke={percentage >= 70 ? "#34d399" : percentage >= 40 ? "#fbbf24" : "#f87171"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(percentage / 100) * 327} 327`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">{percentage}%</span>
            <span className="text-xs text-white/50">Ready</span>
          </div>
        </div>
        <p className="text-white/50 text-sm text-center max-w-md">{userSummary}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">
            {gap.matched_skills.length}
          </div>
          <div className="text-xs text-emerald-400/60 mt-1">Skills Matched</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-400">
            {gap.missing_skills.length}
          </div>
          <div className="text-xs text-red-400/60 mt-1">Skills Missing</div>
        </div>
      </div>

      {/* Matched Skills */}
      {gap.matched_skills.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-emerald-400/80 uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Skills You Have
          </h3>
          <div className="flex flex-wrap gap-2">
            {gap.matched_skills.map((skill: SkillMatch) => (
              <span
                key={skill.name}
                className="px-3 py-1.5 rounded-lg text-sm bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
              >
                {skill.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing Skills */}
      {gap.missing_skills.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-red-400/80 uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Skills to Learn
          </h3>
          <div className="flex flex-wrap gap-2">
            {gap.missing_skills.map((skill: ExtractedSkill) => (
              <span
                key={skill.name}
                className={`px-3 py-1.5 rounded-lg text-sm border ${CATEGORY_COLORS[skill.category] || "bg-white/10 text-white/70 border-white/20"}`}
              >
                {skill.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
