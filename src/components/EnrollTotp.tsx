"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

/** Enrols a TOTP authenticator (Google Authenticator, Microsoft Authenticator, Authy…). */
export function EnrollTotp({ friendlyName, onDone }: { friendlyName: string; onDone: () => void }) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; started.current = true;
    (async () => {
      const sb = supabase();
      // Clear any half-finished enrolment so the name stays unique
      const { data: list } = await sb.auth.mfa.listFactors();
      for (const f of list?.all ?? []) if (f.status === "unverified") await sb.auth.mfa.unenroll({ factorId: f.id });
      const name = `${friendlyName} ${new Date().toISOString().slice(0, 16)}`;
      const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: name, issuer: "Learning Portal" });
      if (error) return setErr(error.message);
      setFactorId(data.id); setQr(data.totp.qr_code); setSecret(data.totp.secret);
    })();
  }, [friendlyName]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault(); if (!factorId) return;
    setBusy(true); setErr(null);
    const { error } = await supabase().auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setBusy(false);
    if (error) return setErr(error.message.includes("Invalid") ? "That code didn't match. Check your phone's time is set automatically and try the newest code." : error.message);
    onDone();
  };

  return (
    <div>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        <li>Open <b>Google Authenticator</b> or <b>Microsoft Authenticator</b> on your phone.</li>
        <li>Tap <b>+</b> and scan this QR code (Microsoft: "Other account").</li>
        <li>Enter the 6-digit code it shows.</li>
      </ol>
      <div className="my-4 flex justify-center">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="Authenticator QR code" className="h-48 w-48 rounded-lg bg-white p-2" />
        ) : <div className="h-48 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />}
      </div>
      {secret && (
        <details className="mb-4 text-sm">
          <summary className="cursor-pointer text-brand-600">Can't scan? Enter this key instead</summary>
          <code className="mt-2 block break-all rounded bg-slate-100 p-2 text-xs dark:bg-slate-800">{secret}</code>
        </details>
      )}
      <form onSubmit={verify} className="space-y-3">
        <input className="input text-center text-lg tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code"
          pattern="[0-9]{6}" maxLength={6} placeholder="000000" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <button className="btn w-full" disabled={busy || !factorId}>{busy ? "Checking…" : "Verify and turn on 2FA"}</button>
      </form>
    </div>
  );
}
