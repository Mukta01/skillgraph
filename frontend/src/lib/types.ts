/**
 * TypeScript interfaces matching the backend Pydantic models.
 */

export interface ExtractedSkill {
  name: string;
  category: "technical" | "soft" | "domain" | "tool" | "certification";
  level: "beginner" | "intermediate" | "advanced";
}

export interface SkillMatch {
  name: string;
  user_level: string;
  required_level: string;
}

export interface GapResult {
  matched_skills: SkillMatch[];
  missing_skills: ExtractedSkill[];
  readiness_score: number;
}

export interface RoadmapResource {
  title: string;
  url: string;
  type: "course" | "documentation" | "video" | "tutorial" | "book";
}

export interface RoadmapSkillDetail {
  name: string;
  estimated_hours: number;
  description: string;
  resources: RoadmapResource[];
}

export interface RoadmapPhase {
  phase_number: number;
  title: string;
  duration_weeks: number;
  skills: RoadmapSkillDetail[];
}

export interface LearningRoadmap {
  target_role: string;
  total_weeks: number;
  phases: RoadmapPhase[];
}

export interface RoleSkillRequirements {
  role_title: string;
  role_category: string;
  seniority: string;
  skills: ExtractedSkill[];
}

export interface AnalysisResponse {
  session_id: string;
  user_skills: ExtractedSkill[];
  user_summary: string;
  role_requirements: RoleSkillRequirements;
  gap: GapResult;
  roadmap: LearningRoadmap;
}

export interface RoleInfo {
  name: string;
  category: string;
}
