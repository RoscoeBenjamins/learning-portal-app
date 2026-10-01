export type Course = {
  code: string; title: string; lecturer: string | null; schedule: string | null;
  venue: string | null; is_project: boolean; sort_order: number; updated_at: string;
};
export type Topic = {
  id: string; course_code: string; position: number; title: string; summary: string | null;
  content_md: string; audio_script: string; key_terms: { term: string; meaning: string }[];
  source_files: { id: string; name: string }[]; updated_at: string;
};
export type Flashcard = { id: number; topic_id: string; position: number; front: string; back: string };
export type Question = {
  id: string; topic_id: string; position: number; question: string; options: string[];
  answer_index: number; explanation: string; difficulty: "easy" | "medium" | "hard";
};
export type Assignment = {
  id: string; course_code: string; title: string; due_date: string | null; brief_md: string;
  breakdown_md: string; model_answer_md: string | null; coach_sections: CoachSection[]; related_topics: string[]; word_limit: number | null; updated_at: string;
};
export type CoachSection = { key: string; title: string; words: number; prompts: string[] };
export type DraftFeedback = { id: number; assignment_id: string; draft_name: string; feedback_md: string; created_at: string };
export type Attempt = {
  id: number; course_code: string; topic_id: string | null; mode: "topic_check" | "test";
  score: number; total: number; answers: { question_id: string; topic_id?: string; chosen: number; correct: boolean }[]; created_at: string;
};
export type DissertationRequest = {
  id: number; topic: string; details: string | null; status: "pending" | "ready"; guide_md: string | null; created_at: string;
};

export function slugCode(code: string) { return code.toLowerCase().replace(/\s+/g, ""); }

/** Understanding rating from a percentage score. */
export function rating(pct: number) {
  if (pct >= 85) return { label: "Strong", tone: "good", note: "You've got this topic. Revisit it briefly before the exam." };
  if (pct >= 65) return { label: "Good", tone: "ok", note: "Solid base. Review the questions you missed and try again." };
  if (pct >= 40) return { label: "Developing", tone: "warn", note: "Some key ideas haven't clicked yet. Re-read the sections linked below." };
  return { label: "Needs work", tone: "bad", note: "Go back through this topic, then retake the check." };
}
