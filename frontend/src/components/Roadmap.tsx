"use client";

import { useState } from "react";
import type { LearningRoadmap, RoadmapPhase, RoadmapSkillDetail, RoadmapResource } from "@/lib/types";

interface RoadmapProps {
  roadmap: LearningRoadmap;
}

const PHASE_COLORS = [
  { bg: "bg-indigo-500/10", border: "border-indigo-500/30", accent: "text-indigo-400", dot: "bg-indigo-500" },
  { bg: "bg-violet-500/10", border: "border-violet-500/30", accent: "text-violet-400", dot: "bg-violet-500" },
  { bg: "bg-cyan-500/10", border: "border-cyan-500/30", accent: "text-cyan-400", dot: "bg-cyan-500" },
  { bg: "bg-amber-500/10", border: "border-amber-500/30", accent: "text-amber-400", dot: "bg-amber-500" },
  { bg: "bg-rose-500/10", border: "border-rose-500/30", accent: "text-rose-400", dot: "bg-rose-500" },
];

const RESOURCE_ICONS: Record<string, string> = {
  course: "🎓",
  documentation: "📄",
  video: "▶️",
  tutorial: "💡",
  book: "📚",
};

export default function Roadmap({ roadmap }: RoadmapProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const { generateRoadmapPdf } = await import("@/lib/generateRoadmapPdf");
      await generateRoadmapPdf(roadmap);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (roadmap.phases.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="text-xl font-semibold text-emerald-400">
          You&apos;re all set!
        </h3>
        <p className="text-white/50 mt-2">
          You have all the skills needed for this role.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">
            Your Learning Path
          </h3>
          <span className="text-sm text-white/40 bg-white/5 px-3 py-1 rounded-full hidden sm:inline-block">
            ~{roadmap.total_weeks} weeks total
          </span>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="text-sm px-4 py-2 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 hover:text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Download Roadmap as PDF"
        >
          {isDownloading ? (
             <span className="animate-spin text-lg leading-none">⏳</span>
          ) : (
             <span className="text-lg leading-none">📥</span>
          )}
          {isDownloading ? "Generating..." : "Download PDF"}
        </button>
      </div>

      {/* Timeline Container for PDF export */}
      <div id="roadmap-container" className="p-4 bg-gray-950 rounded-xl relative">
        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-4 bottom-4 w-px bg-gradient-to-b from-indigo-500/50 via-violet-500/50 to-cyan-500/50" />

          <div className="space-y-6">
            {roadmap.phases.map((phase: RoadmapPhase, idx: number) => {
              const colors = PHASE_COLORS[idx % PHASE_COLORS.length];
              return (
                <div 
                  key={phase.phase_number} 
                  className="relative pl-12"
                >
                  {/* Dot on timeline */}
                  <div className={`absolute left-3 top-5 w-3.5 h-3.5 rounded-full ${colors.dot} ring-4 ring-gray-950`} />

                  {/* Phase card */}
                  <div className={`${colors.bg} border ${colors.border} rounded-xl p-5`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={`font-semibold ${colors.accent}`}>
                        Phase {phase.phase_number}: {phase.title}
                      </h4>
                      <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-md">
                        {phase.duration_weeks}w
                      </span>
                    </div>

                    <div className="space-y-3">
                      {phase.skills.map((skill: RoadmapSkillDetail) => (
                        <div
                          key={skill.name}
                          className="bg-black/20 rounded-lg p-3"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-white/90">
                              {skill.name}
                            </span>
                            <span className="text-xs text-white/30">
                              ~{skill.estimated_hours}h
                            </span>
                          </div>
                          <p className="text-xs text-white/40 mb-2">
                            {skill.description}
                          </p>
                          {skill.resources.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {skill.resources.map((res: RoadmapResource, i: number) => (
                                <a
                                  key={i}
                                  href={res.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="
                                    text-xs px-2 py-1 rounded-md
                                    bg-white/5 text-indigo-300/80
                                    hover:bg-indigo-500/20 hover:text-indigo-300
                                    transition-colors inline-flex items-center gap-1
                                  "
                                >
                                  <span>{RESOURCE_ICONS[res.type] || "🔗"}</span>
                                  {res.title}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

