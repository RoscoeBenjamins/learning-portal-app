"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { q, useData } from "@/lib/useData";
import type { DissertationRequest } from "@/lib/types";
import { Markdown } from "@/components/Markdown";
import { ErrorBox, Loading, PageHeader, Pill } from "@/components/ui";

export default function Dissertation() {
  const list = useData(() => q<DissertationRequest[]>(supabase().from("dissertation_requests").select("*").order("created_at", { ascending: false })));
  const [topic, setTopic] = useState("");
  const [details, setDetails] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const { error } = await supabase().from("dissertation_requests").insert({ topic: topic.trim(), details: details.trim() || null });
    setBusy(false);
    if (error) return setErr(error.message);
    setTopic(""); setDetails(""); list.reload();
  };

  return (
    <div>
      <PageHeader title="Dissertation / project (CIIS 691)"
        subtitle="Enter your project topic to get a full guide: what to read, how to structure each chapter, methodology options, and a timeline." />
      <form onSubmit={submit} className="card space-y-4">
        <div><label className="label" htmlFor="t">Project topic</label>
          <input id="t" className="input" required minLength={10} placeholder="e.g. Designing an SD-WAN architecture for a multi-subsidiary trading group in Ghana"
            value={topic} onChange={(e) => setTopic(e.target.value)} /></div>
        <div><label className="label" htmlFor="d">Anything else? (optional)</label>
          <textarea id="d" className="input min-h-[90px]" placeholder="Supervisor guidance, the organisation you're studying, deadlines, the methods you're thinking of…"
            value={details} onChange={(e) => setDetails(e.target.value)} /></div>
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <button className="btn" disabled={busy}>{busy ? "Submitting…" : "Request project guide"}</button>
        <p className="muted text-xs">Guides are written at the next portal update and appear below. They're for planning and direction only: the research and writing must be your own.</p>
      </form>

      <div className="mt-8 space-y-4">
        {list.loading ? <Loading /> : list.error ? <ErrorBox message={list.error} /> : list.data?.map((r) => (
          <details key={r.id} className="card" open={r.status === "ready" && list.data?.[0]?.id === r.id}>
            <summary className="cursor-pointer">
              <span className="font-semibold">{r.topic}</span>{" "}
              <Pill tone={r.status === "ready" ? "good" : "warn"}>{r.status === "ready" ? "Guide ready" : "Waiting for next update"}</Pill>
            </summary>
            {r.details && <p className="muted mt-2 text-sm">{r.details}</p>}
            {r.guide_md && <div className="mt-4"><Markdown>{r.guide_md}</Markdown></div>}
          </details>
        ))}
      </div>
    </div>
  );
}
