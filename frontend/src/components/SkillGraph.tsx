"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import mermaid from "mermaid";
import type { GapResult, RoleSkillRequirements } from "@/lib/types";

interface SkillGraphProps {
  gap: GapResult;
  roleRequirements: RoleSkillRequirements;
}

const CATEGORY_LABELS: Record<string, string> = {
  technical: "Technical",
  tool: "Tools",
  domain: "Domain",
  soft: "Soft Skills",
  certification: "Certifications",
};

export default function SkillGraph({ gap, roleRequirements }: SkillGraphProps) {
  const [svgContent, setSvgContent] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>("");

  const mermaidMarkdown = useMemo(() => {
    const matchedNames = new Set(gap.matched_skills.map((s) => s.name.toLowerCase()));
    
    // Group skills by category
    const groups: Record<string, typeof roleRequirements.skills> = {};
    for (const skill of roleRequirements.skills) {
      const cat = skill.category || "technical";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(skill);
    }

    let graph = `graph TD\n`;
    
    // Role center node
    const roleId = "RoleCenter";
    const safeRoleTitle = roleRequirements.role_title.replace(/"/g, "'");
    graph += `    ${roleId}["${safeRoleTitle}"]\n`;
    
    const matchedClass = "matchedSkill";
    const missingClass = "missingSkill";
    const roleClass = "roleCenter";
    
    // Styles (Using solid hex colors because commas in rgba() break Mermaid's classDef parser)
    graph += `    classDef ${matchedClass} fill:#064e3b,stroke:#047857,color:#6ee7b7,stroke-width:1.5px,rx:10px,ry:10px;\n`;
    graph += `    classDef ${missingClass} fill:#7f1d1d,stroke:#b91c1c,color:#fca5a5,stroke-width:1.5px,rx:10px,ry:10px;\n`;
    graph += `    classDef ${roleClass} fill:#312e81,stroke:#4f46e5,color:#c7d2fe,stroke-width:2px,rx:14px,ry:14px;\n`;
    graph += `    classDef category fill:transparent,stroke:#4f46e5,stroke-width:1px,stroke-dasharray:5 5,color:#a5b4fc;\n\n`;

    graph += `    class ${roleId} ${roleClass};\n\n`;

    // Subgraphs and nodes
    let nodeIndex = 0;
    Object.entries(groups).forEach(([category, skills], i) => {
      const catLabel = CATEGORY_LABELS[category] || category;
      const catId = `Cat_${i}`;
      
      graph += `    subgraph ${catId} ["${catLabel}"]\n`;
      graph += `      direction TB\n`;
      
      const nodeIds: string[] = [];
      let prevNodeId: string | null = null;
      skills.forEach((skill) => {
        const nodeId = `Node_${nodeIndex++}`;
        const isMatched = matchedNames.has(skill.name.toLowerCase());
        const safeName = skill.name.replace(/"/g, "'"); // Escape quotes
        
        graph += `      ${nodeId}["${safeName}"]\n`;
        graph += `      class ${nodeId} ${isMatched ? matchedClass : missingClass};\n`;
        
        if (prevNodeId) {
          graph += `      ${prevNodeId} ~~~ ${nodeId}\n`;
        }
        prevNodeId = nodeId;
        
        nodeIds.push(nodeId);
      });
      graph += `    end\n`;
      graph += `    class ${catId} category;\n`;
      
      // Edge from role to category
      graph += `    ${roleId} --> ${catId}\n`;
      // Style the edge
      graph += `    linkStyle ${i} stroke:#4f46e5,stroke-width:1.5px;\n\n`;
    });

    return graph;
  }, [gap, roleRequirements]);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'inherit',
    });

    const renderGraph = async () => {
      try {
        const id = `mermaid-graph-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, mermaidMarkdown);
        setSvgContent(svg);
        setError("");
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : String(err);
        console.error("Mermaid rendering failed:", err);
        // Log the generated markdown to console so we can see what broke
        console.log("Failed Markdown:", mermaidMarkdown);
        setError(`Failed to render the skill graph. Error: ${errMessage}\n\nMarkdown:\n${mermaidMarkdown}`);
      }
    };

    renderGraph();
  }, [mermaidMarkdown]);

  return (
    <div className="w-full h-[600px] rounded-xl border border-white/10 bg-gray-950/50 flex flex-col relative overflow-hidden">
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-6 [&>svg]:min-w-full [&>svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 p-6 overflow-auto">
          <div className="text-red-400 font-bold mb-4">Failed to render the skill graph.</div>
          <pre className="text-xs text-red-300/80 bg-red-950/30 p-4 rounded-lg w-full max-w-3xl overflow-x-auto whitespace-pre-wrap font-mono">
            {error}
          </pre>
        </div>
      )}
      {/* Legend */}
      <div className="flex-shrink-0 flex items-center justify-center gap-6 py-3 bg-gray-950/80 border-t border-white/5">
        <div className="flex items-center gap-2 text-xs text-white/50">
          <span className="w-3 h-3 rounded-full bg-emerald-400/60" />
          Skills you have
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <span className="w-3 h-3 rounded-full bg-red-400/60" />
          Skills to learn
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <span className="w-3 h-3 rounded-full bg-indigo-400/60" />
          Categories
        </div>
      </div>
    </div>
  );
}
