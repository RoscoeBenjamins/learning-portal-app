"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { track } from "@/lib/track";
import { Markdown } from "@/components/Markdown";
import { scaleTargets } from "@/components/DraftCoach";
import type { CoachSection } from "@/lib/types";

type Provider = "deepseek" | "perplexity";
type Source = { url: string; title?: string; date?: string };
type Row = { provider: Provider; sections: Record<string, string>; sources: Source[]; model: string | null; updated_at: string };
const NAMES: Record<Provider, string> = { deepseek: "DeepSeek", perplexity: "Perplexity" };
const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export function AiDrafts({ assignmentId, sections: raw, wordLimit }: { assignmentId: string; sections: CoachSection[]; wordLimit: number | null }) {
  const sections = scaleTargets(raw, wordLimit);
  const [provider, setProvider] = useState<Provider>("deepseek");
  const [rows, setRows] = useState<Partial<Record<Provider, Row>>>({});
  const [busy, setBusy] = useState<{ provider: Provider; key: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase().from("ai_drafts").select("provider,sections,sources,model,updated_at").eq("assignment_id", assignmentId).then(({ data }) => {
      const next: Partial<Record<Provider, Row>> = {};
      for (const r of (data ?? []) as Row[]) next[r.provider] = r;
      setRows(next);
    });
  }, [assignmentId]);

  const row = rows[provider];
  const text = row?.sections ?? {};

  const runSection = async (p: Provider, key: string) => {
    setBusy({ provider: p, key });
    const { data, error: fe } = await supabase().functions.invoke("ai-draft", { body: { assignment_id: assignmentId, provider: p, section_key: key } });
    if (fe || data?.error) {
      let msg = data?.error ?? fe?.message ?? "Something went wrong.";
      try { const body = await (fe as { context?: Response })?.context?.json(); if (body?.error) msg = body.error; } catch { /* keep msg */ }
      throw new Error(msg);
    }
    setRows((prev) => {
      const old = prev[p] ?? { provider: p, sections: {}, sources: [], model: null, updated_at: "" };
      return { ...prev, [p]: { ...old, sections: { ...old.sections, [key]: data.text }, sources: data.sources ?? old.sources, model: data.model, updated_at: new Date().toISOString() } };
    });
  };

  const generateAll = async (onlyMissing: boolean) => {
    setError(null);
    const p = provider;
    try {
      // Body sections first, then the reference list so it can see every citation.
      const order = [...sections.filter((s) => s.words > 0), ...sections.filter((s) => s.words === 0)];
      for (const s of order) {
        if (onlyMissing && rows[p]?.sections?.[s.key]?.trim()) continue;
        await runSection(p, s.key);
      }
      track("ai_draft_generated", undefined, { assignmentId, provider: p });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(null); }
  };

  const regenerate = async (key: string) => {
    setError(null);
    try { await runSection(provider, key); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  };

  const asText = () => sections.filter((s) => text[s.key]?.trim()).map((s) => `## ${s.title}\n\n${text[s.key]}`).join("\n\n");
  const copy = async () => { await navigator.clipboard.writeText(asText()); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([asText()], { type: "text/markdown" }));
    a.download = `${assignmentId}-${provider}-draft.md`; a.click();
  };

  if (!sections.length) return <p className="muted py-6 text-center text-[15px]">The section plan for this assignment will appear after the next portal update.</p>;
  const filled = sections.filter((s) => text[s.key]?.trim()).length;
  const total = sections.reduce((n, s) => n + (s.words ? words(text[s.key] ?? "") : 0), 0);
  const target = wordLimit || sections.reduce((n, s) => n + (s.words || 0), 0);
  const running = busy !== null;

  return (
    <div>
      <div className="mb-6 rounded-xl bg-[#FF9500]/10 p-4 text-[14px] leading-snug">
        <b>AI-written drafts.</b> These are written by DeepSeek or Perplexity from your brief. Check your lecturer&apos;s rules on AI use before submitting anything based on them, check every fact, and open every reference to make sure it exists and says what the draft claims.
      </div>

      <div role="tablist" className="mb-5 inline-flex gap-1 rounded-full bg-black/[.05] p-1 dark:bg-white/10">
        {(Object.keys(NAMES) as Provider[]).map((p) => (
          <button key={p} role="tab" aria-selected={provider === p} disabled={running} onClick={() => { setProvider(p); setError(null); }}
            className={`min-h-[36px] rounded-full px-4 text-[14px] transition ${provider === p ? "bg-[var(--card)] font-semibold shadow-sm" : "muted"}`}>
            {NAMES[p]}{rows[p] ? " ✓" : ""}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button className="btn" disabled={running} onClick={() => generateAll(false)}>
          {running ? `Writing ${sections.findIndex((s) => s.key === busy?.key) + 1} of ${sections.length}…` : filled ? `Rewrite whole draft with ${NAMES[provider]}` : `Write draft with ${NAMES[provider]}`}
        </button>
        {filled > 0 && filled < sections.length && !running && <button className="btn-ghost" onClick={() => generateAll(true)}>Finish missing sections</button>}
        {filled > 0 && <button className="btn-ghost" disabled={running} onClick={copy}>{copied ? "Copied" : "Copy"}</button>}
        {filled > 0 && <button className="btn-ghost" disabled={running} onClick={download}>Download</button>}
        {filled > 0 && <span className="muted text-[13px] tabular-nums">{total.toLocaleString("en-GB")} / {target.toLocaleString("en-GB")} words</span>}
      </div>
      {running && <p className="muted -mt-3 mb-6 text-[13px]">Each section takes about 20–60 seconds. Keep this page open until it finishes.</p>}
      {error && <div className="mb-6 rounded-xl bg-[#FF3B30]/10 p-4 text-[14px]">{error}</div>}

      {!filled && !running ? (
        <p className="muted py-6 text-center text-[15px]">No {NAMES[provider]} draft yet. It will follow the section plan in the <b>My draft</b> tab{wordLimit ? ` and your ${wordLimit.toLocaleString("en-GB")}-word limit` : ""}.</p>
      ) : (
        <div className="space-y-8">
          {sections.map((s) => (
            <section key={s.key}>
              <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-1.5">
                <h3 className="text-[17px] font-semibold tracking-tight">{s.title}</h3>
                <span className="flex shrink-0 items-center gap-3 text-[13px]">
                  {s.words > 0 && text[s.key] && <span className="muted tabular-nums">{words(text[s.key])} / ~{s.words}</span>}
                  {!running && text[s.key] && <button className="font-medium text-brand-700 hover:underline dark:text-[#2997FF]" onClick={() => regenerate(s.key)}>Rewrite</button>}
                </span>
              </div>
              <div className="mt-3">
                {busy?.key === s.key && busy.provider === provider ? <p className="muted animate-pulse text-[15px]">Writing…</p>
                  : text[s.key] ? <Markdown>{text[s.key]}</Markdown> : <p className="muted text-[14px]">Not written yet.</p>}
              </div>
            </section>
          ))}
          {provider === "perplexity" && (row?.sources?.length ?? 0) > 0 && (
            <details className="text-[14px]">
              <summary className="cursor-pointer font-medium">Web sources Perplexity read ({row!.sources.length})</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {row!.sources.map((s) => <li key={s.url}><a className="text-brand-700 hover:underline dark:text-[#2997FF]" href={s.url} target="_blank" rel="noreferrer">{s.title || s.url}</a>{s.date ? <span className="muted"> · {s.date}</span> : null}</li>)}
              </ul>
            </details>
          )}
          {row?.model && <p className="muted text-[12px]">Model: {row.model} · last written {new Date(row.updated_at).toLocaleString("en-GB")}</p>}
        </div>
      )}
    </div>
  );
}
