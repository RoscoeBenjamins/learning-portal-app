"use client";
import { useRouter } from "next/navigation";
import { EnrollTotp } from "@/components/EnrollTotp";
import { supabase } from "@/lib/supabase-browser";

export default function Enroll() {
  const router = useRouter();
  return (
    <div className="card">
      <h1 className="text-xl font-semibold">Set up two-factor authentication</h1>
      <p className="muted mb-4 mt-1 text-sm">Required for every account. You'll enter a code from your phone each time you sign in.</p>
      <EnrollTotp friendlyName="Authenticator" onDone={() => { router.replace("/"); router.refresh(); }} />
      <button className="muted mt-4 text-sm hover:underline" onClick={async () => { await supabase().auth.signOut(); router.replace("/login"); }}>Sign out</button>
    </div>
  );
}
