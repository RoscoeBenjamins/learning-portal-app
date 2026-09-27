"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase-browser";

const NAV = [
  { href: "/", label: "Courses" },
  { href: "/tests", label: "Tests" },
  { href: "/performance", label: "Performance" },
  { href: "/dissertation", label: "Dissertation" },
  { href: "/settings", label: "Settings" },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const bare = ["/login", "/signup", "/mfa", "/auth"].some((p) => path.startsWith(p));
  if (bare) return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">{children}</main>;
  const signOut = async () => { await supabase().auth.signOut(); router.replace("/login"); router.refresh(); };
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-4 py-3">
          <Link href="/" className="mr-4 whitespace-nowrap font-semibold text-brand-600">Learning Portal</Link>
          {NAV.map((n) => {
            const active = n.href === "/" ? path === "/" || path.startsWith("/courses") : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${active ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-100" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                {n.label}
              </Link>
            );
          })}
          <button onClick={signOut} className="ml-auto whitespace-nowrap rounded-md px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">Sign out</button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </>
  );
}
