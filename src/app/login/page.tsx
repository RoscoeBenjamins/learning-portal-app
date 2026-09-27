"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setErr(error.message);
    router.replace("/mfa/verify"); router.refresh();
  };
  const forgot = async () => {
    if (!email) return setErr("Enter your email first.");
    const { error } = await supabase().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/callback?next=/settings` });
    if (error) setErr(error.message); else setMsg("Check your email for a password reset link.");
  };

  return (
    <div className="card">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="muted mt-1 text-sm">Learning Portal · MSc IT</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div><label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="label" htmlFor="pw">Password</label>
          <input id="pw" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {err && <p className="text-sm text-rose-600">{err}</p>}
        {msg && <p className="text-sm text-emerald-600">{msg}</p>}
        <button className="btn w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <button onClick={forgot} className="text-brand-600 hover:underline">Forgot password?</button>
        <Link href="/signup" className="text-brand-600 hover:underline">Create account</Link>
      </div>
    </div>
  );
}
