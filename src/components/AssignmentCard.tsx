"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import type { Assignment, DraftFeedback } from "@/lib/types";
import { Markdown } from "@/components/Markdown";
import { DraftCoach } from "@/components/DraftCoach";
import { AiDrafts } from "@/components/AiDrafts";

function due(d: string | null) {
  if (!d) return null;
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  const date = new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  if (days < 0) return { text: `Was due ${date}`, tone: "tone-bad" };
  if (days === 0) return { text: "Due today", tone: "tone-bad" };
  return { text: `Due ${date} · ${days} day${days === 1 ? "" : "s"} left`, tone: days <= 7 ? "tone-warn" : "tone-ok" };
}

function useIsAdmin() {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    supabase().auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase().from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle().then(({ data: row }) => setAdmin(!!row));
    });
  }, []);
  return admin;
}

export function AssignmentCard({ a, feedback, slug, topicTitle }: { a: Assignment; feedback: DraftFeedback[]; slug: string; topicTitle: (id: string) => string }) {
  const admin = useIsAdmin();
  const tabs = [
    { id: "brief", label: "Brief", show: !!a.brief_md },
    { id: "breakdown", label: "Breakdown", show: true },
    { id: "model", label: "Model answer", show: !!a.model_answer_md },
    { id: "draft", label: "My draft", show: true },
    { id: "ai", label: "AI drafts", show: admin },
    { id: "feedback", label: `Drive drafts (${feedback.length})`, show: feedback.length > 0 },
  ].filter((t) => t.show);
  const [tab, setTab] = useState(a.brief_md ? "brief" : "breakdown");
  const d = due(a.due_date);
  const [limit, setLimit] = useState<number | null>(a.word_limit ?? null);

  return (
    <article className="card p-0">
      <header className="border-b border-[var(--line)] p-5 sm:p-6">
        {d && <span className={`pill ${d.tone}`}>{d.text}</span>}
        <h2 className="mt-2 text-[22px] font-bold leading-tight tracking-tight">{a.title}</h2>
        <WordLimit assignmentId={a.id} value={limit} onSaved={setLimit} admin={admin} />
        {a.related_topics.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="muted">Revise first:</span>
            {a.related_topics.map((id) => (
              <Link key={id} href={`/courses/${slug}/book/${encodeURIComponent(id)}`} className="rounded-full bg-brand-500/10 px-3 py-1 font-medium text-brand-700 hover:bg-brand-500/15 dark:text-[#2997FF]">{topicTitle(id)}</Link>
            ))}
          </div>
        )}
        <div role="tablist" className="mt-5 inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-black/[.05] p-1 dark:bg-white/10">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`min-h-[36px] whitespace-nowrap rounded-full px-4 text-[14px] transition ${tab === t.id ? "bg-[var(--card)] font-semibold shadow-sm" : "muted hover:text-ink dark:hover:text-white"}`}>{t.label}</button>
          ))}
        </div>
      </header>
      <div className="p-5 sm:p-8" role="tabpanel">
        <div className="mx-auto max-w-[680px]">
          {tab === "brief" && <Markdown>{a.brief_md}</Markdown>}
          {tab === "breakdown" && <Markdown>{a.breakdown_md}</Markdown>}
          {tab === "model" && a.model_answer_md && (
            <>
              <div className="mb-6 rounded-xl bg-[#FF9500]/10 p-4 text-[14px] leading-snug">
                <b>This answers a similar question, not your assignment.</b> Study how it is built — the argument, evidence and structure — then write your own answer in your own words. Notes in <i>italics</i> explain why each part scores marks.
              </div>
              <Markdown>{a.model_answer_md}</Markdown>
            </>
          )}
          {tab === "ai" && admin && <AiDrafts assignmentId={a.id} sections={a.coach_sections ?? []} wordLimit={limit} />}
          {tab === "draft" && <DraftCoach assignmentId={a.id} sections={a.coach_sections ?? []} wordLimit={limit} />}
          {tab === "feedback" && (feedback.length ? feedback.map((f) => (
            <div key={f.id} className="mb-8 last:mb-0">
              <h3 className="text-[17px] font-semibold">“{f.draft_name}”</h3>
              <p className="muted mb-2 text-[13px]">{new Date(f.created_at).toLocaleString("en-GB")}</p>
              <Markdown>{f.feedback_md}</Markdown>
            </div>
          )) : (
            <div className="py-6 text-center">
              <p className="font-semibold">No feedback yet</p>
              <p className="muted mx-auto mt-1 max-w-sm text-[15px]">Put your own draft in this course's <b>Assignment</b> Drive folder, named starting <code>MY DRAFT -</code>. Feedback appears here after the next portal update.</p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

/** Shows the assignment's word limit; admins can set or change it. */
function WordLimit({ assignmentId, value, onSaved, admin }: { assignmentId: string; value: number | null; onSaved: (n: number | null) => void; admin: boolean }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(value ? String(value) : "");
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");

  const save = async () => {
    const n = input.trim() === "" ? null : Math.round(Number(input.replace(/[, ]/g, "")));
    if (n !== null && (!Number.isFinite(n) || n < 50 || n > 50000)) return setState("error");
    setState("saving");
    const { error } = await supabase().from("assignments").update({ word_limit: n }).eq("id", assignmentId);
    if (error) return setState("error");
    onSaved(n); setEditing(false); setState("idle");
  };

  if (editing) return (
    <form className="mt-3 flex flex-wrap items-center gap-2 text-[14px]" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <label htmlFor={`wl-${assignmentId}`} className="muted">Word limit</label>
      <input id={`wl-${assignmentId}`} inputMode="numeric" autoFocus className="input h-9 w-28 py-0 tabular-nums" placeholder="e.g. 3000"
        value={input} onChange={(e) => { setInput(e.target.value); setState("idle"); }} />
      <button className="btn h-9 min-h-0 px-4" disabled={state === "saving"}>{state === "saving" ? "Saving…" : "Save"}</button>
      <button type="button" className="btn-ghost h-9 min-h-0 px-3" onClick={() => { setEditing(false); setInput(value ? String(value) : ""); setState("idle"); }}>Cancel</button>
      {state === "error" && <span className="w-full text-[13px] text-[#FF3B30]">Enter a number between 50 and 50,000, or leave it blank to clear it.</span>}
    </form>
  );

  if (!value && !admin) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[14px]">
      {value ? <span className="pill bg-black/[.05] text-[13px] dark:bg-white/10">Word limit: {value.toLocaleString("en-GB")} words</span> : <span className="muted">No word limit set</span>}
      {admin && <button className="text-[14px] font-medium text-brand-700 hover:underline dark:text-[#2997FF]" onClick={() => setEditing(true)}>{value ? "Change" : "Add word limit"}</button>}
    </div>
  );
}
