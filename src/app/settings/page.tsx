"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useData } from "@/lib/useData";
import { EnrollTotp } from "@/components/EnrollTotp";
import { PageHeader, Loading } from "@/components/ui";

export default function Settings() {
  const factors = useData(async () => (await supabase().auth.mfa.listFactors()).data?.totp ?? []);
  const [adding, setAdding] = useState(false);
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 10) return setMsg("Use at least 10 characters.");
    const { error } = await supabase().auth.updateUser({ password: pw });
    setMsg(error ? error.message : "Password updated."); setPw("");
  };
  const remove = async (id: string) => {
    if ((factors.data?.length ?? 0) <= 1) return alert("Keep at least one authenticator. Add another before removing this one.");
    if (!confirm("Remove this authenticator?")) return;
    await supabase().auth.mfa.unenroll({ factorId: id }); factors.reload();
  };

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader title="Account settings" />
      <section className="card">
        <h2 className="font-semibold">Authenticator apps</h2>
        <p className="muted mt-1 text-sm">Add a second one (for example Microsoft Authenticator as well as Google Authenticator) so you're not locked out if you lose a phone.</p>
        {factors.loading ? <Loading /> : (
          <ul className="mt-3 divide-y divide-slate-200 text-sm dark:divide-slate-800">
            {factors.data?.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2">
                <span>{f.friendly_name ?? "Authenticator"}</span>
                <button className="text-rose-600 hover:underline" onClick={() => remove(f.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
        {adding ? (
          <div className="mt-4"><EnrollTotp friendlyName="Backup authenticator" onDone={() => { setAdding(false); factors.reload(); }} /></div>
        ) : <button className="btn-ghost mt-3" onClick={() => setAdding(true)}>Add another authenticator</button>}
      </section>
      <section className="card">
        <h2 className="font-semibold">Change password</h2>
        <form onSubmit={changePw} className="mt-3 flex gap-2">
          <input className="input" type="password" autoComplete="new-password" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button className="btn">Save</button>
        </form>
        {msg && <p className="mt-2 text-sm">{msg}</p>}
      </section>
    </div>
  );
}
