"use client";
import Link from "next/link";
import { useState } from "react";
import type { Assignment, DraftFeedback } from "@/lib/types";
import { Markdown } from "@/components/Markdown";
import { DraftCoach } from "@/components/DraftCoach";

function due(d: string | null) {
  if (!d) return null;
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  const date = new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  if (days < 0) return { text: `Was due ${date}`, tone: "tone-bad" };
  if (days === 0) return { text: "Due today", tone: "tone-bad" };
  return { text: `Due ${date} · ${days} day${days === 1 ? "" : "s"} left`, tone: days <= 7 ? "tone-warn" : "tone-ok" };
}

export function AssignmentCard({ a, feedback, slug, topicTitle }: { a: Assignment; feedback: DraftFeedback[]; slug: string; topicTitle: (id: string) => string }) {
  const tabs = [
    { id: "brief", label: "Brief", show: !!a.brief_md },
    { id: "breakdown", label: "Breakdown", show: true },
    { id: "model", label: "Model answer", show: !!a.model_answer_md },
    { id: "draft", label: "My draft", show: true },
    { id: "feedback", label: `Drive drafts (${feedback.length})`, show: feedback.length > 0 },
  ].filter((t) => t.show);
  const [tab, setTab] = useState(a.brief_md ? "brief" : "breakdown");
  const d = due(a.due_date);

  return (
    <article className="card p-0">
      <header className="border-b border-[var(--line)] p-5 sm:p-6">
        {d && <span className={`pill ${d.tone}`}>{d.text}</span>}
        <h2 className="mt-2 text-[22px] font-bold leading-tight tracking-tight">{a.title}</h2>
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
          {tab === "draft" && <DraftCoach assignmentId={a.id} sections={a.coach_sections ?? []} />}
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
