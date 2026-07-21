// Syllabus, gamification thresholds, and the design-token palette pulled from the
// "GATE Force App" design handoff (dark hardcore-academy aesthetic). Shared so web
// and mobile never drift on subject lists, rank names, or theme colors.

export const SUBJECT_CODES = [
  "prob_stats",
  "linear_algebra",
  "calculus_opt",
  "pdsa",
  "dbms_warehousing",
  "machine_learning",
  "ai_reasoning",
  "general_aptitude",
] as const;

export type SubjectCode = (typeof SUBJECT_CODES)[number];

export const SUBJECT_NAMES: Record<SubjectCode, string> = {
  prob_stats: "Probability and Statistics",
  linear_algebra: "Linear Algebra",
  calculus_opt: "Calculus and Optimization",
  pdsa: "Programming, Data Structures and Algorithms",
  dbms_warehousing: "Database Management and Warehousing",
  machine_learning: "Machine Learning",
  ai_reasoning: "AI (Search, Logic, Reasoning under Uncertainty)",
  general_aptitude: "General Aptitude",
};

export const GATE_DA_MARKS = {
  generalAptitude: 15,
  subjectQuestions: 85,
  total: 100,
} as const;

/** Mandatory daily drill size for Streak Armor. */
export const DAILY_DRILL_QUESTION_COUNT = 10;

/** A mock scoring below this percentage triggers a Penalty Drill lock. */
export const PENALTY_THRESHOLD_PERCENT = 40;

/** Ordered lowest -> highest. Must match `rank_thresholds` seed data in Postgres. */
export const RANK_THRESHOLDS = [
  { rankName: "Novice", minXp: 0 },
  { rankName: "Cadet", minXp: 500 },
  { rankName: "Sergeant", minXp: 1500 },
  { rankName: "Captain", minXp: 3000 },
  { rankName: "Major", minXp: 5500 },
  { rankName: "Commander", minXp: 9000 },
  { rankName: "Grandmaster", minXp: 14000 },
] as const;

export type RankName = (typeof RANK_THRESHOLDS)[number]["rankName"];

export function rankForXp(xp: number): RankName {
  let current: RankName = RANK_THRESHOLDS[0].rankName;
  for (const tier of RANK_THRESHOLDS) {
    if (xp >= tier.minXp) current = tier.rankName;
  }
  return current;
}

/** Design tokens from the handoff mockup — single source of truth for both apps. */
export const THEME = {
  colors: {
    bg: "#0b0a09",
    bgRadialInner: "#1a1613",
    card: "#1f1d1a",
    cardAlt: "#29261f",
    border: "rgba(255,255,255,0.07)",
    textPrimary: "#f5f1ea",
    textSecondary: "#a39c8f",
    textMuted: "#8a8377",
    textFaint: "#6b645a",
    accentOrange: "#ff5b2e",
    accentOrangeText: "#1a0e08",
    accentGold: "#ffb020",
    danger: "#ff3b30",
    dangerText: "#ff6259",
    success: "#7cd992",
  },
  fonts: {
    display: "'Barlow Condensed', sans-serif",
    body: "Inter, system-ui, sans-serif",
  },
} as const;
