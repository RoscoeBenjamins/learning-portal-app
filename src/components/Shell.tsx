"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { track } from "@/lib/track";
import { supabase } from "@/lib/supabase-browser";

const I = (d: string) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);
const NAV = [
  { href: "/", label: "Courses", icon: I("M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13z") },
  { href: "/tests", label: "Tests", icon: I("M9 11l2 2 4-4M5 4h14v16H5z") },
  { href: "/performance", label: "Progress", icon: I("M5 20V11M12 20V5M19 20v-6") },
  { href: "/dissertation", label: "Thesis", icon: I("M12 3l9 5-9 5-9-5 9-5zM6 10.5V16c2 2 10 2 12 0v-5.5") },
  { href: "/settings", label: "Settings", icon: I("M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.5 7.5 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 1.7-1l2.4 1 2-3.4z") },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const bare = ["/login", "/signup", "/mfa", "/auth"].some((p) => path.startsWith(p));
  const [admin, setAdmin] = useState(false);
  useEffect(() => { if (!bare) track("page_view", path); }, [path, bare]);
  useEffect(() => { if (!bare) supabase().rpc("is_admin").then(({ data }) => setAdmin(!!data), () => {}); }, [bare]);
  if (bare) return <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-10">{children}</main>;
  const signOut = async () => { track("sign_out", path); await supabase().auth.signOut(); router.replace("/login"); router.refresh(); };
  const isActive = (href: string) => (href === "/" ? path === "/" || path.startsWith("/courses") : path.startsWith(href));
  return (
    <>
      <header className="glass sticky top-0 z-20 border-b border-[var(--line)]">
        <div className="mx-auto flex h-12 max-w-5xl items-center gap-1 px-4">
          <Link href="/" className="mr-3 flex items-center gap-2 text-[17px] font-semibold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#0071E3] to-[#5856D6] text-[13px] font-bold text-white" aria-hidden>L</span>
            <span className="hidden sm:inline">Learning Portal</span>
          </Link>
          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-[14px] transition ${isActive(n.href) ? "bg-black/[.06] font-medium dark:bg-white/[.12]" : "muted hover:text-ink dark:hover:text-white"}`}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center">
            {admin && <Link href="/admin" className={`min-h-[44px] content-center rounded-full px-3 text-[14px] ${path.startsWith("/admin") ? "font-semibold" : "muted"}`}>Admin</Link>}
            <Link href="/feedback" className={`min-h-[44px] content-center rounded-full px-3 text-[14px] ${path.startsWith("/feedback") ? "font-semibold" : "muted"}`}>Feedback</Link>
          </div>
          <button onClick={signOut} className=" min-h-[44px] rounded-full px-3 text-[14px] text-brand-600 dark:text-[#2997FF]">Sign out</button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-8 md:pb-16 md:pt-10">{children}</main>
      <nav aria-label="Main" className="glass fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line)] pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="mx-auto flex max-w-md">
          {NAV.map((n) => (
            <li key={n.href} className="flex-1">
              <Link href={n.href} aria-current={isActive(n.href) ? "page" : undefined}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${isActive(n.href) ? "text-brand-500 dark:text-[#2997FF]" : "text-[#8E8E93]"}`}>
                {n.icon}{n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
