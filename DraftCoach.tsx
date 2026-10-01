"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { track } from "@/lib/track";
import { Markdown } from "@/components/Markdown";
import type { CoachSection } from "@/lib/types";

type Draft = { id: number; sections: Record<string, string>; feedback_status: "none" | "requested" | "ready"; requested_at: string | null; feedback_md: string | null; feedback_at: string | null };
const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

/** Scale each section's target so the targets add up to the assignment's word limit. */
export function scaleTargets(sections: CoachSection[], limit: number | null | undefined): CoachSection[] {
  const base = sections.reduce((n, s) => n + (s.words || 0), 0);
  if (!limit || !base) return sections;
  return sections.map((s) => ({ ...s, words: s.words ? Math.max(10, Math.round((s.words * limit) / base / 10) * 10) : 0 }));
}

export function DraftCoach({ assignmentId, sections: rawSections, wordLimit }: { assignmentId: string; sections: CoachSection[]; wordLimit?: number | null }) {
  const sections = scaleTargets(rawSections, wordLimit);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [text, setText] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    supabase().from("drafts").select("*").eq("assignment_id", assignmentId).maybeSingle().then(({ data }) => {
      if (data) { setDraft(data as Draft); setText((data as Draft).sections ?? {}); }
      setLoaded(true);
    });
  }, [assignmentId]);

  const save = async (next: Record<string, string>, extra: Partial<Draft> = {}) => {
    setSaved("saving");
    const { data, error } = await supabase().from("drafts")
      .upsert({ assignment_id: assignmentId, sections: next, updated_at: new Date().toISOString(), ...extra }, { onConflict: "user_id,assignment_id" })
      .select().single();
    if (error) return setSaved("error");
    setDraft(data as Draft); setSaved("saved");
  };
  const edit = (key: string, v: string) => {
    const next = { ...text, [key]: v };
    setText(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save(next), 1200);
  };
  const request = async () => {
    clearTimeout(timer.current);
    await save(text, { feedback_status: "requested", requested_at: new Date().toISOString() });
    track("draft_feedback_requested", undefined, { assignmentId });
  };
  const download = () => {
    const body = sections.map((s) => `${s.title}\n\n${text[s.key] ?? ""}`).join("\n\n\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body], { type: "text/plain" })); a.download = "my-draft.txt"; a.click();
  };

  if (!loaded) return <p className="muted py-6 text-[15px]">Loading your draft…</p>;
  if (!sections.length) return <p className="muted py-6 text-center text-[15px]">Writing prompts for this assignment will appear after the next portal update.</p>;
  const total = sections.reduce((n, s) => n + words(text[s.key] ?? ""), 0);
  const target = wordLimit || sections.reduce((n, s) => n + (s.words || 0), 0);
  const status = draft?.feedback_status ?? "none";

  return (
    <div>
      <div className="mb-6 rounded-xl bg-brand-500/[.07] p-4 text-[14px] leading-snug">
        Write your answer section by section. The prompts are questions to think about, not text to copy. Only you can see your draft. It saves automatically.
      </div>

      {status === "ready" && draft?.feedback_md && (
        <section className="mb-8 rounded-2xl border border-[#34C759]/40 p-5">
          <div className="mb-2 flex items-center justify-between text-[13px]"><b className="text-[15px]">Feedback on your draft</b>
            <span className="muted">{draft.feedback_at && new Date(draft.feedback_at).toLocaleString("en-GB")}</span></div>
          <Markdown>{draft.feedback_md}</Markdown>
        </section>
      )}

      <div className="space-y-8">
        {sections.map((s) => {
          const w = words(text[s.key] ?? "");
          const pct = s.words ? Math.min(100, Math.round((w / s.words) * 100)) : 0;
          return (
            <section key={s.key}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[17px] font-semibold tracking-tight">{s.title}</h3>
                {s.words > 0 && <span className="muted shrink-0 text-[13px] tabular-nums">{w} / ~{s.words} words</span>}
              </div>
              {s.words > 0 && <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/[.06] dark:bg-white/10" aria-hidden><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} /></div>}
              <ul className="muted mt-3 list-disc space-y-1 pl-5 text-[14px] leading-snug">{s.prompts.map((p) => <li key={p}>{p}</li>)}</ul>
              <textarea aria-label={s.title} className="input mt-3 min-h-[160px] resize-y py-3 leading-relaxed" value={text[s.key] ?? ""} onChange={(e) => edit(s.key, e.target.value)} placeholder="Write in your own words…" />
            </section>
          );
        })}
      </div>

      <div className="sticky bottom-20 mt-8 flex flex-wrap items-center gap-3 rounded-2xl bg-[var(--card)] p-3 shadow-[0_4px_24px_rgba(0,0,0,.1)] md:bottom-4">
        <button className="btn" disabled={total < 50 || status === "requested"} onClick={request}>
          {status === "requested" ? "Feedback requested" : status === "ready" ? "Get feedback on this version" : "Get feedback"}
        </button>
        <button className="btn-ghost" onClick={download}>Download</button>
        <span className="muted text-[13px] tabular-nums">{total}{target ? ` / ${wordLimit ? "" : "~"}${target.toLocaleString("en-GB")}` : ""} words{wordLimit && total > wordLimit * 1.1 ? " (over the limit)" : ""} · {saved === "saving" ? "Saving…" : saved === "error" ? "Couldn't save — check your connection" : "Saved"}</span>
        {status === "requested" && <span className="muted w-full text-[13px]">Feedback arrives after the next update (around 05:54 or 18:54, Accra time). You can keep editing, but the feedback will be on the version saved when it runs.</span>}
      </div>
    </div>
  );
}
