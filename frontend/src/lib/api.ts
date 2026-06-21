/**
 * API client for the SkillGraph backend.
 */

import type { AnalysisResponse, RoleInfo } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SESSION_KEY = "skillgraph_session_id";

/** Get or create an anonymous session ID. */
function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

/** Store the session ID after a successful analysis. */
function setSessionId(id: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, id);
  }
}

/**
 * Analyze a resume against a target role.
 * This is the main API call — sends the resume file and target role,
 * receives the full analysis (skills, gap, roadmap).
 */
export async function analyzeResume(
  file: File,
  targetRole: string,
  additionalSkills?: string
): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append("resume", file);
  formData.append("target_role", targetRole);
  
  if (additionalSkills && additionalSkills.trim() !== "") {
    formData.append("additional_skills", additionalSkills.trim());
  }

  const headers: Record<string, string> = {};
  const sessionId = getSessionId();
  if (sessionId) {
    headers["X-Session-ID"] = sessionId;
  }

  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Analysis failed" }));
    throw new Error(error.detail || "Analysis failed");
  }

  const data: AnalysisResponse = await res.json();

  // Store session ID for future requests
  setSessionId(data.session_id);

  return data;
}

/**
 * Fetch the list of popular roles for the dropdown.
 */
export async function fetchRoles(): Promise<RoleInfo[]> {
  const res = await fetch(`${API_BASE}/api/roles`);
  if (!res.ok) {
    throw new Error("Failed to fetch roles");
  }
  return res.json();
}
