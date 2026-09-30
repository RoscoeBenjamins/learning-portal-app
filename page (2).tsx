"use client";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { q, useData } from "@/lib/useData";
import { getCourses } from "@/lib/courses";
import { slugCode, type Attempt } from "@/lib/types";
import { courseColor } from "@/lib/courseColors";
import { ErrorBox, Loading, PageHeader } from "@/components/ui";

export default function Home() {
  const { data, error, loading } = useData(async () => {
    const [courses, topics, attempts, assignments] = await Promise.all([
      getCourses(),
      q<{ id: string; course_code: string }[]>(supabase().from("topics").select("id,course_code")),
      q<Attempt[]>(supabase().from("attempts").select("course_code,topic_id,score,total,mode")),
      q<{ course_code: string }[]>(supabase().from("assignments").select("course_code")),
    ]);
    return { courses, topics, attempts, assignments };
  });
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "No data"} />;

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div>
      <div className="eyebrow">{today}</div>
      <PageHeader title="Your courses" subtitle="MSc-MPhil IT · Semester 2" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.courses.map((c) => {
          const topics = data.topics.filter((t) => t.course_code === c.code);
          const checked = new Set(data.attempts.filter((a) => a.course_code === c.code && a.topic_id).map((a) => a.topic_id));
          const pct = topics.length ? Math.round((checked.size / topics.length) * 100) : 0;
          const asg = data.assignments.filter((a) => a.course_code === c.code).length;
          const href = c.is_project ? "/dissertation" : `/courses/${slugCode(c.code)}`;
          const color = courseColor(c.code);
          return (
            <Link key={c.code} href={href} className="card-link relative flex flex-col overflow-hidden">
              <span className="absolute inset-x-0 top-0 h-1" style={{ background: color }} aria-hidden />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="muted flex items-center gap-1.5 text-[13px] font-semibold tracking-wide"><span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />{c.code}</div>
                  <div className="mt-1 text-[19px] font-semibold leading-snug tracking-tight">{c.title}</div>
                </div>
                {!c.is_project && <Ring pct={pct} color={color} />}
              </div>
              <div className="muted mt-2 text-[13px]">{[c.lecturer, c.schedule, c.venue].filter(Boolean).join(" · ")}</div>
              <div className="mt-auto flex gap-2 pt-5 text-[13px]">
                {c.is_project ? <span className="muted">Dissertation guides ›</span> : (
                  <>
                    <span className="rounded-full bg-black/[.05] px-2.5 py-1 dark:bg-white/10">{topics.length ? `${checked.size} of ${topics.length} topics` : "No materials yet"}</span>
                    {asg > 0 && <span className="rounded-full bg-black/[.05] px-2.5 py-1 dark:bg-white/10">{asg} assignment{asg === 1 ? "" : "s"}</span>}
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 20, c = 2 * Math.PI * r;
  return (
    <div className="relative h-12 w-12 shrink-0" role="img" aria-label={`${pct}% of topics checked`}>
      <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" strokeWidth="5" className="stroke-black/[.07] dark:stroke-white/[.12]" />
        <circle cx="24" cy="24" r={r} fill="none" strokeWidth="5" stroke={color} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[11px] font-semibold tabular-nums">{pct}%</span>
    </div>
  );
}
