"use client";
import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    if (password.length < 10) return setErr("Use at least 10 characters.");
    setBusy(true);
    const { data, error } = await supabase().auth.signUp({
      email, password,
      options: { data: { full_name: name }, emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) return setErr(error.message);
    if (data.session) location.href = "/mfa/enroll"; else setDone(true);
  };

  if (done) return (
    <div className="card">
      <h1 className="text-xl font-semibold">Check your email</h1>
      <p className="muted mt-2 text-sm">We sent a confirmation link to {email}. After you confirm, you'll set up your authenticator app.</p>
    </div>
  );

  return (
    <div className="card">
      <h1 className="text-xl font-semibold">Create account</h1>
      <p className="muted mt-1 text-sm">You'll need Google Authenticator or Microsoft Authenticator on your phone.</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div><label className="label" htmlFor="n">Full name</label>
          <input id="n" className="input" required value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className="label" htmlFor="e">Email</label>
          <input id="e" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="label" htmlFor="p">Password</label>
          <input id="p" className="input" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <button className="btn w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
      </form>
      <p className="mt-4 text-sm">Already have an account? <Link href="/login" className="text-brand-600 hover:underline">Sign in</Link></p>
    </div>
  );
}
