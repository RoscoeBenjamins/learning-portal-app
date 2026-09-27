"use client";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { q, useData } from "@/lib/useData";
import { getCourses } from "@/lib/courses";
import { slugCode, type Attempt } from "@/lib/types";
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

  return (
    <div>
      <PageHeader title="Your courses" subtitle="MSc-MPhil IT · Semester 2 (2nd cohort, January)" />
      <div className="grid gap-4 sm:grid-cols-2">
        {data.courses.map((c) => {
          const topics = data.topics.filter((t) => t.course_code === c.code);
          const checked = new Set(data.attempts.filter((a) => a.course_code === c.code && a.topic_id).map((a) => a.topic_id));
          const pct = topics.length ? Math.round((checked.size / topics.length) * 100) : 0;
          const asg = data.assignments.filter((a) => a.course_code === c.code).length;
          const href = c.is_project ? "/dissertation" : `/courses/${slugCode(c.code)}`;
          return (
            <Link key={c.code} href={href} className="card block transition hover:border-brand-500">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">{c.code}</div>
              <div className="mt-1 text-lg font-semibold">{c.title}</div>
              <div className="muted mt-1 text-sm">{c.lecturer}{c.schedule ? ` · ${c.schedule}` : ""}{c.venue ? ` · ${c.venue}` : ""}</div>
              {c.is_project ? (
                <div className="muted mt-4 text-sm">Dissertation and project guides →</div>
              ) : (
                <>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="muted mt-2 flex justify-between text-xs">
                    <span>{topics.length ? `${checked.size}/${topics.length} topics checked` : "No materials yet"}</span>
                    <span>{asg} assignment{asg === 1 ? "" : "s"}</span>
                  </div>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
