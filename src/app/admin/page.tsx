"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { q, useData } from "@/lib/useData";
import { ErrorBox, Loading, PageHeader, Pill } from "@/components/ui";

type U = { id: string; email: string; created_at: string; last_sign_in_at: string | null; banned_until: string | null; mfa_factors: number; is_admin: boolean; events_7d: number; last_seen: string | null; quiz_attempts: number };
type Ev = { id: number; user_id: string; email: string; event: string; path: string | null; meta: Record<string, unknown>; created_at: string };
type Au = { created_at: string; email: string | null; action: string; ip: string | null };
type Fb = { id: number; user_id: string; category: string; rating: number | null; message: string; page: string | null; status: string; admin_reply: string | null; created_at: string };

const dt = (s: string | null) => (s ? new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const ago = (s: string | null) => { if (!s) return "never"; const m = (Date.now() - new Date(s).getTime()) / 60000; return m < 60 ? `${Math.round(m)} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
function csv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const body = [keys.join(","), ...rows.map((r) => keys.map((k) => JSON.stringify(typeof r[k] === "object" ? JSON.stringify(r[k]) : r[k] ?? "")).join(","))].join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" })); a.download = name; a.click();
}

export default function Admin() {
  const [tab, setTab] = useState<"users" | "activity" | "signins" | "feedback">("users");
  const [nonce, setNonce] = useState(0);
  const [who, setWho] = useState<U | null>(null);
  const { data, error, loading } = useData(async () => {
    const sb = supabase();
    const [users, events, auth, feedback] = await Promise.all([
      q<U[]>(sb.rpc("admin_users")),
      q<Ev[]>(sb.rpc("admin_activity", { p_user: who?.id ?? null, p_limit: 300 })),
      q<Au[]>(sb.rpc("admin_auth_log", { p_limit: 300 })),
      q<Fb[]>(sb.from("feedback").select("*").order("created_at", { ascending: false })),
    ]);
    return { users, events, auth, feedback };
  }, [nonce, who?.id]);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error?.includes("not authorised") ? "This page is for the portal admin only." : error ?? "No data"} />;
  const { users, events, auth, feedback } = data;
  const email = (id: string) => users.find((u) => u.id === id)?.email ?? id.slice(0, 8);
  const act = async (fn: string, args: Record<string, unknown>, confirmMsg: string) => {
    if (!confirm(confirmMsg)) return;
    const { error } = await supabase().rpc(fn, args);
    if (error) alert(error.message); else setNonce((n) => n + 1);
  };
  const saveFb = async (id: number, patch: Partial<Fb>) => {
    const { error } = await supabase().from("feedback").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) alert(error.message); else setNonce((n) => n + 1);
  };
  const active7 = users.filter((u) => u.events_7d > 0).length;
  const newFb = feedback.filter((f) => f.status === "new").length;
  const TABS = [["users", `Users (${users.length})`], ["activity", "Activity"], ["signins", "Sign-ins"], ["feedback", `Feedback${newFb ? ` (${newFb} new)` : ""}`]] as const;

  return (
    <div>
      <PageHeader title="Admin" subtitle="Accounts, activity and feedback across the portal." />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Accounts", users.length], ["Active in last 7 days", active7], ["Without 2FA", users.filter((u) => !u.mfa_factors).length], ["New feedback", newFb]].map(([l, v]) => (
          <div key={l} className="card p-4"><div className="text-[28px] font-bold tabular-nums">{v}</div><div className="muted text-[13px]">{l}</div></div>
        ))}
      </div>

      <div role="tablist" className="mb-6 inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-black/[.05] p-1 dark:bg-white/10">
        {TABS.map(([id, l]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`min-h-[36px] whitespace-nowrap rounded-full px-4 text-[14px] ${tab === id ? "bg-[var(--card)] font-semibold shadow-sm" : "muted"}`}>{l}</button>
        ))}
      </div>

      {tab === "users" && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-left text-[14px]">
            <thead className="muted text-[12px] uppercase tracking-wide"><tr className="border-b border-[var(--line)]">
              {["Account", "Joined", "Last sign-in", "Last active", "7-day events", "Quizzes", "2FA", ""].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>
              {users.map((u) => {
                const banned = !!u.banned_until && new Date(u.banned_until) > new Date();
                return (
                  <tr key={u.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-4 py-3"><div className="font-medium">{u.email}</div>
                      <div className="mt-1 flex gap-1">{u.is_admin && <Pill tone="ok">admin</Pill>}{banned && <Pill tone="bad">suspended</Pill>}</div></td>
                    <td className="muted px-4 py-3">{dt(u.created_at)}</td>
                    <td className="muted px-4 py-3">{ago(u.last_sign_in_at)}</td>
                    <td className="muted px-4 py-3">{ago(u.last_seen)}</td>
                    <td className="px-4 py-3 tabular-nums">{u.events_7d}</td>
                    <td className="px-4 py-3 tabular-nums">{u.quiz_attempts}</td>
                    <td className="px-4 py-3">{u.mfa_factors ? <Pill tone="good">On</Pill> : <Pill tone="warn">Off</Pill>}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button className="px-2 text-brand-600 dark:text-[#2997FF]" onClick={() => { setWho(u); setTab("activity"); }}>Activity</button>
                      {!u.is_admin && <button className="px-2 text-brand-600 dark:text-[#2997FF]" onClick={() => act("admin_set_suspended", { p_user: u.id, p_suspend: !banned }, `${banned ? "Restore" : "Suspend"} ${u.email}?`)}>{banned ? "Restore" : "Suspend"}</button>}
                      {u.mfa_factors > 0 && <button className="px-2 text-[#C4221A] dark:text-[#FF453A]" onClick={() => act("admin_reset_mfa", { p_user: u.id }, `Reset 2FA for ${u.email}? They will set it up again at next sign-in.`)}>Reset 2FA</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "activity" && (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[14px]">
            {who ? <><span>Showing <b>{who.email}</b></span><button className="btn-ghost min-h-[36px] px-3" onClick={() => setWho(null)}>Show everyone</button></> : <span className="muted">Latest 300 events from all accounts.</span>}
            <button className="btn-ghost ml-auto min-h-[36px] px-3" onClick={() => csv("activity.csv", events)}>Export CSV</button>
          </div>
          <Log rows={events.map((e) => ({ t: e.created_at, who: e.email, what: e.event.replace(/_/g, " "), where: e.path ?? (e.meta?.target ? `→ ${email(String(e.meta.target))}` : "") }))} />
        </div>
      )}

      {tab === "signins" && (
        <div>
          <div className="mb-3 flex items-center text-[14px]"><span className="muted">Sign-ins, sign-ups, 2FA and password events recorded by Supabase Auth.</span>
            <button className="btn-ghost ml-auto min-h-[36px] px-3" onClick={() => csv("signins.csv", auth)}>Export CSV</button></div>
          <Log rows={auth.map((a) => ({ t: a.created_at, who: a.email ?? "—", what: a.action?.replace(/_/g, " ") ?? "", where: a.ip ?? "" }))} />
        </div>
      )}

      {tab === "feedback" && (
        !feedback.length ? <p className="muted">No feedback yet.</p> : (
          <ul className="space-y-3">
            {feedback.map((f) => <FeedbackItem key={f.id} f={f} email={email(f.user_id)} onSave={(p) => saveFb(f.id, p)} />)}
          </ul>
        )
      )}
    </div>
  );
}

function Log({ rows }: { rows: { t: string; who: string; what: string; where: string }[] }) {
  if (!rows.length) return <p className="muted">Nothing recorded yet.</p>;
  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full min-w-[620px] text-left text-[14px]">
        <tbody>{rows.map((r, i) => (
          <tr key={i} className="border-b border-[var(--line)] last:border-0">
            <td className="muted whitespace-nowrap px-4 py-2.5 tabular-nums">{dt(r.t)}</td>
            <td className="px-4 py-2.5">{r.who}</td>
            <td className="px-4 py-2.5 font-medium">{r.what}</td>
            <td className="muted px-4 py-2.5 font-mono text-[12px]">{r.where}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function FeedbackItem({ f, email, onSave }: { f: Fb; email: string; onSave: (p: Partial<Fb>) => void }) {
  const [reply, setReply] = useState(f.admin_reply ?? "");
  return (
    <li className="card">
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <b>{email}</b><span className="muted">· {dt(f.created_at)} · {f.category}{f.rating ? ` · ${"★".repeat(f.rating)}` : ""}</span>
        <select className="input ml-auto w-auto min-h-[36px] py-0 text-[14px]" value={f.status} onChange={(e) => onSave({ status: e.target.value })} aria-label="Status">
          {["new", "planned", "done", "declined"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[15px]">{f.message}</p>
      <div className="mt-3 flex gap-2">
        <input className="input" placeholder="Reply (the student sees this on their Feedback page)" value={reply} onChange={(e) => setReply(e.target.value)} />
        <button className="btn-ghost" disabled={reply === (f.admin_reply ?? "")} onClick={() => onSave({ admin_reply: reply || null })}>Save</button>
      </div>
    </li>
  );
}
