"use client";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { getCourseBySlug, getTopics } from "@/lib/courses";
import { q, useData } from "@/lib/useData";
import type { Question } from "@/lib/types";
import { CourseNav } from "@/components/CourseNav";
import { Quiz } from "@/components/Quiz";
import { Empty, ErrorBox, Loading, NOT_YET, PageHeader } from "@/components/ui";

function shuffle<T>(a: T[]) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

export default function CourseTest({ params }: { params: { slug: string } }) {
  const { data, error, loading } = useData(async () => {
    const course = await getCourseBySlug(params.slug);
    const topics = await getTopics(course.code);
    const questions = topics.length ? await q<Question[]>(supabase().from("questions").select("*").in("topic_id", topics.map((t) => t.id))) : [];
    return { course, topics, questions };
  }, [params.slug]);
  const [scope, setScope] = useState<string>("all");
  const [count, setCount] = useState<number>(15);
  const [run, setRun] = useState(0);

  const picked = useMemo(() => {
    if (!data || !run) return [];
    const pool = scope === "all" ? data.questions : data.questions.filter((x) => x.topic_id === scope);
    return shuffle(pool).slice(0, count);
  }, [data, scope, count, run]);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "Not found"} />;
  const { course, topics, questions } = data;
  const titles = Object.fromEntries(topics.map((t) => [t.id, `${t.position}. ${t.title}`]));

  return (
    <div>
      <PageHeader back={{ href: "/tests", label: "All tests" }} title={`${course.code}: Tests`} subtitle={course.title} />
      <CourseNav slug={params.slug} />
      {!questions.length ? <Empty title="No test questions yet">{NOT_YET}</Empty> : !run ? (
        <div className="card max-w-lg space-y-4">
          <div><label className="label" htmlFor="scope">Topics</label>
            <select id="scope" className="input" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="all">All topics (mixed)</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{titles[t.id]}</option>)}
            </select></div>
          <div><label className="label" htmlFor="count">Number of questions</label>
            <select id="count" className="input" value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[10, 15, 25, 50, 999].map((n) => <option key={n} value={n}>{n === 999 ? "All" : n}</option>)}
            </select></div>
          <button className="btn" onClick={() => setRun((r) => r + 1)}>Start test</button>
        </div>
      ) : (
        <div>
          <button className="btn-ghost mb-4" onClick={() => setRun(0)}>← New test</button>
          <Quiz key={run} questions={picked} courseCode={course.code} topicId={scope === "all" ? null : scope} mode="test" topicTitles={titles} />
        </div>
      )}
    </div>
  );
}
