/**
 * Publishes generated course content into Supabase.
 *
 *   npx tsx scripts/publish-content.ts status              # what's already processed + pending dissertation requests
 *   npx tsx scripts/publish-content.ts publish file.json…   # upsert one or more content bundles
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment (or .env.local).
 * The service-role key bypasses row-level security: never commit it and never give it to the web app.
 * Bundle format: see content/README.md.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

type Card = { front: string; back: string };
type Q = { id: string; question: string; options: string[]; answer_index: number; explanation: string; difficulty?: string };
type TopicIn = {
  id: string; course_code: string; position: number; title: string; summary?: string; content_md: string;
  audio_script?: string; key_terms?: { term: string; meaning: string }[]; source_files?: { id: string; name: string }[];
  flashcards?: Card[]; questions?: Q[];
};
type Bundle = {
  processed_files?: { id: string; name: string; modified_time?: string }[];
  topics?: TopicIn[];
  assignments?: { id: string; course_code: string; title: string; drive_file_id?: string; due_date?: string | null; brief_md?: string; breakdown_md: string; related_topics?: string[] }[];
  draft_feedback?: { assignment_id: string; drive_file_id: string; draft_name: string; feedback_md: string }[];
  dissertation_guides?: { id: number; guide_md: string }[];
};

function check(b: Bundle, file: string) {
  const errs: string[] = [];
  for (const t of b.topics ?? []) {
    if (!t.id || !t.course_code || !t.title || typeof t.position !== "number") errs.push(`topic ${t.id}: id, course_code, title, position required`);
    for (const q of t.questions ?? []) {
      if (!q.id) errs.push(`topic ${t.id}: question missing id`);
      if (!Array.isArray(q.options) || q.options.length < 2) errs.push(`question ${q.id}: needs ≥2 options`);
      if (!(q.answer_index >= 0 && q.answer_index < (q.options?.length ?? 0))) errs.push(`question ${q.id}: answer_index out of range`);
      if (!q.explanation) errs.push(`question ${q.id}: explanation required`);
    }
  }
  if (errs.length) { console.error(`✗ ${file}\n  ` + errs.join("\n  ")); process.exit(1); }
}

async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

async function publish(file: string) {
  const b: Bundle = JSON.parse(readFileSync(file, "utf8"));
  check(b, file);
  const now = new Date().toISOString();

  for (const t of b.topics ?? []) {
    const { flashcards = [], questions = [], ...row } = t;
    await must(db.from("topics").upsert({ summary: null, audio_script: "", key_terms: [], source_files: [], ...row, updated_at: now }), `topic ${t.id}`);
    await must(db.from("flashcards").delete().eq("topic_id", t.id), `clear cards ${t.id}`);
    if (flashcards.length) await must(db.from("flashcards").insert(flashcards.map((c, i) => ({ ...c, topic_id: t.id, position: i }))), `cards ${t.id}`);
    if (questions.length) {
      await must(db.from("questions").upsert(questions.map((q, i) => ({ difficulty: "medium", ...q, topic_id: t.id, position: i }))), `questions ${t.id}`);
      await must(db.from("questions").delete().eq("topic_id", t.id).not("id", "in", `(${questions.map((q) => `"${q.id}"`).join(",")})`), `prune questions ${t.id}`);
    }
    console.log(`  topic   ${t.course_code} #${t.position} ${t.title} (${flashcards.length} cards, ${questions.length} questions)`);
  }
  for (const a of b.assignments ?? []) {
    await must(db.from("assignments").upsert({ brief_md: "", related_topics: [], ...a, updated_at: now }), `assignment ${a.id}`);
    console.log(`  assign  ${a.course_code} ${a.title}`);
  }
  for (const f of b.draft_feedback ?? []) {
    await must(db.from("draft_feedback").upsert(f, { onConflict: "drive_file_id" }), `feedback ${f.drive_file_id}`);
    console.log(`  feedback ${f.draft_name}`);
  }
  for (const g of b.dissertation_guides ?? []) {
    await must(db.from("dissertation_requests").update({ guide_md: g.guide_md, status: "ready", updated_at: now }).eq("id", g.id), `guide ${g.id}`);
    console.log(`  guide   #${g.id}`);
  }
  // Record processed files last, so a failed run is retried next time
  if (b.processed_files?.length) {
    await must(db.from("processed_files").upsert(b.processed_files.map((f) => ({ drive_file_id: f.id, name: f.name, modified_time: f.modified_time ?? null, processed_at: now }))), "processed_files");
    console.log(`  marked ${b.processed_files.length} Drive file(s) as processed`);
  }
  // Touch the course so "last updated" reflects the change
  const codes = new Set([...(b.topics ?? []).map((t) => t.course_code), ...(b.assignments ?? []).map((a) => a.course_code)]);
  for (const c of codes) await must(db.from("courses").update({ updated_at: now }).eq("code", c), `course ${c}`);
  console.log(`✓ ${file}`);
}

async function status() {
  const [courses, files, topics, pending, assignments] = await Promise.all([
    must(db.from("courses").select("code,title,drive_folder_id").order("sort_order"), "courses"),
    must(db.from("processed_files").select("*"), "processed_files"),
    must(db.from("topics").select("id,course_code,position,title").order("position"), "topics"),
    must(db.from("dissertation_requests").select("id,topic,details,created_at").eq("status", "pending"), "dissertation"),
    must(db.from("assignments").select("id,course_code,title,drive_file_id"), "assignments"),
  ]);
  console.log(JSON.stringify({ courses, processed_files: files, topics, assignments, pending_dissertation_requests: pending }, null, 2));
}

const [cmd, ...files] = process.argv.slice(2);
(async () => {
  if (cmd === "status") return status();
  if (cmd === "publish" && files.length) { for (const f of files) await publish(f); return; }
  console.error("Usage: publish-content.ts status | publish <bundle.json>…"); process.exit(1);
})().catch((e) => { console.error(e.message ?? e); process.exit(1); });
