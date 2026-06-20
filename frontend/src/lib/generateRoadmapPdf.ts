/**
 * Generates a clean, structured PDF from roadmap data using jsPDF.
 * All resource links are real PDF annotations → guaranteed clickable.
 */
import type { LearningRoadmap } from "@/lib/types";

const PAGE_WIDTH = 210; // A4 mm
const PAGE_HEIGHT = 297;
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

const PHASE_COLORS: [number, number, number][] = [
  [99, 102, 241],   // indigo
  [139, 92, 246],   // violet
  [6, 182, 212],    // cyan
  [245, 158, 11],   // amber
  [244, 63, 94],    // rose
];

export async function generateRoadmapPdf(roadmap: LearningRoadmap): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  let y = MARGIN;

  // ── Helper: check if we need a new page ──
  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // ── Helper: draw wrapped text, returns final y ──
  const drawWrapped = (
    text: string,
    x: number,
    startY: number,
    maxWidth: number,
    lineHeight: number
  ): number => {
    const lines = doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, x, startY);
      startY += lineHeight;
    }
    return startY;
  };

  // ════════════════════════════════════════════
  //  TITLE PAGE
  // ════════════════════════════════════════════
  // Background
  doc.setFillColor(15, 15, 25);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("Learning Roadmap", PAGE_WIDTH / 2, 80, { align: "center" });

  // Role
  doc.setFontSize(18);
  doc.setTextColor(129, 140, 248); // indigo-400
  doc.text(roadmap.target_role || "Your Target Role", PAGE_WIDTH / 2, 95, { align: "center" });

  // Duration badge
  doc.setFontSize(12);
  doc.setTextColor(180, 180, 200);
  doc.text(
    `Estimated duration: ~${roadmap.total_weeks} weeks`,
    PAGE_WIDTH / 2,
    112,
    { align: "center" }
  );

  // Phases summary
  doc.setFontSize(10);
  doc.setTextColor(140, 140, 160);
  doc.text(
    `${roadmap.phases.length} phases • Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    PAGE_WIDTH / 2,
    122,
    { align: "center" }
  );

  // Branding
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 100);
  doc.text("Powered by SkillGraph", PAGE_WIDTH / 2, PAGE_HEIGHT - 20, {
    align: "center",
  });

  // ════════════════════════════════════════════
  //  PHASE PAGES — each phase on a new page
  // ════════════════════════════════════════════
  for (let idx = 0; idx < roadmap.phases.length; idx++) {
    const phase = roadmap.phases[idx];
    const color = PHASE_COLORS[idx % PHASE_COLORS.length];

    doc.addPage();
    y = MARGIN;

    // White background for readability
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, "F");

    // ── Phase header bar ──
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 14, 3, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Phase ${phase.phase_number}: ${phase.title}`, MARGIN + 6, y + 9);

    // Duration badge
    doc.setFontSize(10);
    const durationText = `${phase.duration_weeks} weeks`;
    const durationWidth = doc.getTextWidth(durationText) + 8;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(
      MARGIN + CONTENT_WIDTH - durationWidth - 4,
      y + 2.5,
      durationWidth,
      9,
      2,
      2,
      "F"
    );
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(
      durationText,
      MARGIN + CONTENT_WIDTH - durationWidth / 2 - 4,
      y + 9,
      { align: "center" }
    );

    y += 22;

    // ── Skills ──
    for (const skill of phase.skills) {
      // Estimate space needed for this skill card
      const descLines = doc.splitTextToSize(skill.description, CONTENT_WIDTH - 16);
      const estimatedHeight = 22 + descLines.length * 4.5 + (skill.resources.length > 0 ? 8 + skill.resources.length * 6 : 0);
      ensureSpace(estimatedHeight);

      // Skill card background
      doc.setFillColor(248, 249, 250);
      doc.setDrawColor(230, 230, 235);
      const cardHeight = estimatedHeight;
      doc.roundedRect(MARGIN, y, CONTENT_WIDTH, cardHeight, 2, 2, "FD");

      let cardY = y + 7;

      // Skill name
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(skill.name, MARGIN + 6, cardY);

      // Hours
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.setFont("helvetica", "normal");
      const hoursText = `~${skill.estimated_hours}h`;
      doc.text(hoursText, MARGIN + CONTENT_WIDTH - 6, cardY, {
        align: "right",
      });

      cardY += 6;

      // Description
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.setFont("helvetica", "normal");
      for (const line of descLines) {
        doc.text(line, MARGIN + 6, cardY);
        cardY += 4.5;
      }

      // Resources with clickable links
      if (skill.resources.length > 0) {
        cardY += 3;
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "bold");
        doc.text("Resources:", MARGIN + 6, cardY);
        cardY += 5;

        doc.setFont("helvetica", "normal");
        for (const res of skill.resources) {
          ensureSpace(7);

          const icon =
            res.type === "course"
              ? "[Course]"
              : res.type === "video"
              ? "[Video]"
              : res.type === "book"
              ? "[Book]"
              : res.type === "tutorial"
              ? "[Tutorial]"
              : "[Doc]";

          // Icon label
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(8);
          doc.text(`${icon}  `, MARGIN + 8, cardY);
          const iconWidth = doc.getTextWidth(`${icon}  `);

          // Link text — blue, underlined
          doc.setTextColor(37, 99, 235); // blue-600
          const linkX = MARGIN + 8 + iconWidth;
          const linkText = res.title;
          const linkWidth = doc.getTextWidth(linkText);

          doc.text(linkText, linkX, cardY);

          // Underline
          doc.setDrawColor(37, 99, 235);
          doc.setLineWidth(0.2);
          doc.line(linkX, cardY + 0.5, linkX + linkWidth, cardY + 0.5);

          // ★ Create a real PDF link annotation — THIS is what makes the link clickable
          doc.link(linkX, cardY - 3, linkWidth, 4, { url: res.url });

          cardY += 6;
        }
      }

      y += cardHeight + 5;
    }
  }

  // ── Save ──
  const roleName = (roadmap.target_role || "role")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`${roleName}-roadmap-${dateStr}.pdf`);
}
