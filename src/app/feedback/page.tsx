"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { q, useData } from "@/lib/useData";
import { track } from "@/lib/track";
import { ErrorBox, Loading, PageHeader, Pill } from "@/components/ui";

type Fb = { id: number; category: string; rating: number | null; message: string; status: string; admin_reply: string | null; created_at: string };
const CATS = [["suggestion", "Suggestion"], ["bug", "Something's broken"], ["content", "Course content"], ["other", "Other"]];
const TONE: Record<string, string> = { new: "ok", planned: "warn", done: "good", declined: "bad" };

export default function FeedbackPage() {
  const [nonce, setNonce] = useState(0);
  const { data, error, loading } = useData(() => q<Fb[]>(supabase().from("feedback").select("*").order("created_at", { ascending: false })), [nonce]);
  const [cat, setCat] = useState("suggestion");
  const [rating, setRating] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | string>("idle");

  const send = async () => {
    setState("sending");
    const { error } = await supabase().from("feedback").insert({ category: cat, rating, message: msg.trim(), page: document.referrer || null });
    if (error) return setState(error.message);
    track("feedback_sent", "/feedback", { category: cat });
    setMsg(""); setRating(null); setState("sent"); setNonce((n) => n + 1);
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Feedback" subtitle="Tell us what would make the portal better. Every message is read." />
      <div className="card space-y-5">
        <div>
          <span className="label">What's it about?</span>
          <div className="flex flex-wrap gap-2">
            {CATS.map(([v, l]) => (
              <button key={v} onClick={() => setCat(v)} aria-pressed={cat === v}
                className={`min-h-[40px] rounded-full px-4 text-[14px] transition ${cat === v ? "bg-brand-500 font-medium text-white" : "bg-black/[.05] dark:bg-white/10"}`}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">How is the portal working for you? (optional)</span>
          <div className="flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} role="radio" aria-checked={rating === n} aria-label={`${n} of 5`} onClick={() => setRating(rating === n ? null : n)}
                className={`h-11 w-11 rounded-full text-[20px] ${rating && n <= rating ? "text-[#FF9500]" : "text-black/20 dark:text-white/25"}`}>★</button>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="fb">Your message</label>
          <textarea id="fb" className="input min-h-[140px] py-3" maxLength={4000} value={msg} onChange={(e) => setMsg(e.target.value)}
            placeholder="E.g. It would help if the audio overview could be downloaded for offline listening." />
        </div>
        <div className="flex items-center gap-3">
          <button className="btn" disabled={msg.trim().length < 3 || state === "sending"} onClick={send}>{state === "sending" ? "Sending…" : "Send feedback"}</button>
          {state === "sent" && <span className="text-[15px] text-[#1B7A34] dark:text-[#30D158]">Thanks — sent.</span>}
          {!["idle", "sending", "sent"].includes(state) && <span className="text-[15px] text-[#C4221A]">Couldn't send: {state}</span>}
        </div>
      </div>
      <p className="muted mt-3 text-[13px]">To keep the portal running well, the admin can see account details, sign-ins and which pages are used.</p>

      <h2 className="mb-3 mt-10 text-[22px] font-bold tracking-tight">Your messages</h2>
      {loading ? <Loading /> : error ? <ErrorBox message={error} /> : !data?.length ? <p className="muted text-[15px]">Nothing sent yet.</p> : (
        <ul className="space-y-3">
          {data.map((f) => (
            <li key={f.id} className="card">
              <div className="flex items-center justify-between gap-2 text-[13px]">
                <span className="muted">{new Date(f.created_at).toLocaleDateString("en-GB")} · {CATS.find((c) => c[0] === f.category)?.[1]}</span>
                <Pill tone={TONE[f.status]}>{f.status}</Pill>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[15px]">{f.message}</p>
              {f.admin_reply && <p className="mt-3 rounded-xl bg-brand-500/[.07] p-3 text-[15px]"><b>Reply:</b> {f.admin_reply}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
