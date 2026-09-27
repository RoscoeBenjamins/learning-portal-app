"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

function Verify() {
  const router = useRouter();
  const params = useSearchParams();
  const [factors, setFactors] = useState<{ id: string; name: string }[]>([]);
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase().auth.mfa.listFactors().then(({ data, error }) => {
      if (error) return setErr(error.message);
      const t = (data?.totp ?? []).map((f) => ({ id: f.id, name: f.friendly_name ?? "Authenticator" }));
      setFactors(t); setFactorId(t[0]?.id ?? "");
      if (!t.length) router.replace("/mfa/enroll");
    });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const { error } = await supabase().auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setBusy(false);
    if (error) return setErr("That code didn't work. Use the newest code from your authenticator app.");
    const next = params.get("next");
    router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
    router.refresh();
  };

  return (
    <div className="card">
      <h1 className="text-xl font-semibold">Enter your 6-digit code</h1>
      <p className="muted mt-1 text-sm">Open Google Authenticator or Microsoft Authenticator and enter the code for Learning Portal.</p>
      <form onSubmit={submit} className="mt-5 space-y-3">
        {factors.length > 1 && (
          <select className="input" value={factorId} onChange={(e) => setFactorId(e.target.value)} aria-label="Authenticator">
            {factors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        )}
        <input className="input text-center text-lg tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" autoFocus
          pattern="[0-9]{6}" maxLength={6} placeholder="000000" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <button className="btn w-full" disabled={busy || !factorId}>{busy ? "Checking…" : "Verify"}</button>
      </form>
      <button className="muted mt-4 text-sm hover:underline" onClick={async () => { await supabase().auth.signOut(); router.replace("/login"); }}>Use a different account</button>
    </div>
  );
}
export default function Page() { return <Suspense><Verify /></Suspense>; }
