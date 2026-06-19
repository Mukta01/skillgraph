"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { GapResult, RoleSkillRequirements } from "@/lib/types";

interface SkillGraphProps {
  gap: GapResult;
  roleRequirements: RoleSkillRequirements;
}

/** Category → column position mapping for layout */
const CATEGORY_COLS: Record<string, number> = {
  technical: 0,
  tool: 1,
  domain: 2,
  soft: 3,
  certification: 4,
};

const CATEGORY_LABELS: Record<string, string> = {
  technical: "Technical",
  tool: "Tools",
  domain: "Domain",
  soft: "Soft Skills",
  certification: "Certifications",
};

export default function SkillGraph({ gap, roleRequirements }: SkillGraphProps) {
  const matchedNames = useMemo(
    () => new Set(gap.matched_skills.map((s) => s.name.toLowerCase())),
    [gap.matched_skills]
  );

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Group skills by category
    const groups: Record<string, typeof roleRequirements.skills> = {};
    for (const skill of roleRequirements.skills) {
      const cat = skill.category || "technical";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(skill);
    }

    const colWidth = 280;
    const rowHeight = 80;
    const headerHeight = 50;

    // Create category header nodes + skill nodes
    Object.entries(groups).forEach(([category, skills]) => {
      const col = CATEGORY_COLS[category] ?? Object.keys(groups).indexOf(category);
      const x = col * colWidth + 50;

      // Category header node
      nodes.push({
        id: `header-${category}`,
        position: { x, y: 0 },
        data: { label: CATEGORY_LABELS[category] || category },
        type: "default",
        style: {
          background: "rgba(99, 102, 241, 0.15)",
          border: "1px solid rgba(99, 102, 241, 0.3)",
          borderRadius: "10px",
          color: "#a5b4fc",
          fontSize: "12px",
          fontWeight: "600",
          textTransform: "uppercase" as const,
          letterSpacing: "0.05em",
          padding: "6px 16px",
          width: "auto",
        },
        draggable: false,
        selectable: false,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });

      skills.forEach((skill, idx) => {
        const isMatched = matchedNames.has(skill.name.toLowerCase());
        const y = headerHeight + idx * rowHeight + 20;

        nodes.push({
          id: `skill-${skill.name}`,
          position: { x, y },
          data: { label: skill.name },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          style: {
            background: isMatched
              ? "rgba(52, 211, 153, 0.12)"
              : "rgba(248, 113, 113, 0.12)",
            border: `1.5px solid ${isMatched ? "rgba(52, 211, 153, 0.5)" : "rgba(248, 113, 113, 0.5)"}`,
            borderRadius: "10px",
            color: isMatched ? "#6ee7b7" : "#fca5a5",
            fontSize: "13px",
            fontWeight: "500",
            padding: "8px 16px",
            width: "auto",
            minWidth: "120px",
            textAlign: "center" as const,
          },
        });

        // Edge from header to skill
        edges.push({
          id: `edge-${category}-${skill.name}`,
          source: `header-${category}`,
          target: `skill-${skill.name}`,
          type: "smoothstep",
          animated: !isMatched,
          style: {
            stroke: isMatched
              ? "rgba(52, 211, 153, 0.3)"
              : "rgba(248, 113, 113, 0.2)",
            strokeWidth: 1.5,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 12,
            height: 12,
            color: isMatched
              ? "rgba(52, 211, 153, 0.5)"
              : "rgba(248, 113, 113, 0.3)",
          },
        });
      });
    });

    // Add a central role node
    const totalCols = Object.keys(groups).length;
    const centerX = ((totalCols - 1) * colWidth) / 2 + 50;
    nodes.push({
      id: "role-center",
      position: { x: centerX - 60, y: -100 },
      data: { label: roleRequirements.role_title },
      style: {
        background: "rgba(99, 102, 241, 0.2)",
        border: "2px solid rgba(99, 102, 241, 0.6)",
        borderRadius: "14px",
        color: "#c7d2fe",
        fontSize: "15px",
        fontWeight: "700",
        padding: "10px 24px",
        width: "auto",
      },
      draggable: false,
    });

    // Connect role to each category header
    Object.keys(groups).forEach((category) => {
      edges.push({
        id: `edge-role-${category}`,
        source: "role-center",
        target: `header-${category}`,
        type: "smoothstep",
        style: { stroke: "rgba(99, 102, 241, 0.3)", strokeWidth: 1.5 },
      });
    });

    return { nodes, edges };
  }, [gap, roleRequirements, matchedNames]);

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden border border-white/10 bg-gray-950/50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background color="rgba(255,255,255,0.03)" gap={20} />
        <Controls
          showInteractive={false}
          className="!bg-gray-900/80 !border-white/10 !rounded-lg [&>button]:!bg-transparent [&>button]:!border-white/10 [&>button]:!text-white/50 [&>button:hover]:!bg-white/10"
        />
      </ReactFlow>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 py-3 bg-gray-950/80 border-t border-white/5">
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
