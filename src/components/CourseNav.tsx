"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function CourseNav({ slug }: { slug: string }) {
  const path = usePathname();
  const base = `/courses/${slug}`;
  const tabs = [
    { href: base, label: "Overview", exact: true },
    { href: `${base}/book`, label: "Course book" },
    { href: `${base}/assignments`, label: "Assignments" },
    { href: `${base}/audio`, label: "Audio overviews" },
    { href: `/tests/${slug}`, label: "Tests" },
  ];
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
      {tabs.map((t) => {
        const active = t.exact ? path === t.href : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${active ? "border-brand-600 font-medium text-brand-700 dark:text-brand-100" : "border-transparent muted hover:text-slate-900 dark:hover:text-white"}`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
