"use client";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { getCourses } from "@/lib/courses";
import { q, useData } from "@/lib/useData";
import { slugCode, type Attempt } from "@/lib/types";
import { ErrorBox, Loading, PageHeader } from "@/components/ui";

export default function Tests() {
  const { data, error, loading } = useData(async () => {
    const [courses, qs, attempts] = await Promise.all([
      getCourses(),
      q<{ topic_id: string; topics: { course_code: string } }[]>(supabase().from("questions").select("topic_id, topics!inner(course_code)")),
      q<Attempt[]>(supabase().from("attempts").select("*").eq("mode", "test").order("created_at", { ascending: false }).limit(50)),
    ]);
    return { courses: courses.filter((c) => !c.is_project), qs, attempts };
  });
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "No data"} />;
  return (
    <div>
      <PageHeader title="Tests" subtitle="Practice tests from every topic's flashcards and questions. Wrong answers are explained and linked to the topic to revise." />
      <div className="grid gap-4 sm:grid-cols-2">
        {data.courses.map((c) => {
          const n = data.qs.filter((x) => x.topics.course_code === c.code).length;
          const last = data.attempts.find((a) => a.course_code === c.code);
          return (
            <Link key={c.code} href={`/tests/${slugCode(c.code)}`} className="card-link">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">{c.code}</div>
              <div className="mt-1 font-semibold">{c.title}</div>
              <div className="muted mt-2 text-sm">{n ? `${n} questions available` : "No questions yet"}</div>
              {last && <div className="muted text-sm">Last test: {Math.round((last.score / last.total) * 100)}% on {new Date(last.created_at).toLocaleDateString("en-GB")}</div>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
