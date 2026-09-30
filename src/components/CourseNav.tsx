"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { courseColor } from "@/lib/courseColors";

export function CourseNav({ slug }: { slug: string }) {
  const path = usePathname();
  const base = `/courses/${slug}`;
  const color = courseColor(slug);
  const tabs = [
    { href: base, label: "Overview", exact: true },
    { href: `${base}/book`, label: "Book" },
    { href: `${base}/assignments`, label: "Assignments" },
    { href: `${base}/audio`, label: "Audio" },
    { href: `/tests/${slug}`, label: "Tests" },
  ];
  return (
    <nav aria-label="Course sections" className="-mx-4 mb-8 overflow-x-auto px-4">
      <div className="inline-flex gap-1 rounded-full bg-black/[.05] p-1 dark:bg-white/10">
        {tabs.map((t) => {
          const active = t.exact ? path === t.href : path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}
              style={active ? { boxShadow: `inset 0 -2px 0 ${color}` } : undefined}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-[14px] transition ${active ? "bg-[var(--card)] font-semibold shadow-sm" : "muted hover:text-ink dark:hover:text-white"}`}>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
