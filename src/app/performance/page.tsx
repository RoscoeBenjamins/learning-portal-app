"use client";
import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { getCourses } from "@/lib/courses";
import { q, useData } from "@/lib/useData";
import { rating, slugCode, type Attempt, type Topic } from "@/lib/types";
import { Empty, ErrorBox, Loading, PageHeader, Pill } from "@/components/ui";

type TopicStat = { topic: Pick<Topic, "id" | "title" | "position" | "course_code">; correct: number; total: number; pct: number | null; attempts: number };

export default function Performance() {
  const { data, error, loading } = useData(async () => {
    const [courses, topics, attempts] = await Promise.all([
      getCourses(),
      q<TopicStat["topic"][]>(supabase().from("topics").select("id,title,position,course_code").order("position")),
      q<Attempt[]>(supabase().from("attempts").select("*").order("created_at")),
    ]);
    return { courses: courses.filter((c) => !c.is_project), topics, attempts };
  });
  const [sel, setSel] = useState<string | null>(null);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "No data"} />;

  const code = sel ?? data.courses[0]?.code;
  const course = data.courses.find((c) => c.code === code);
  const topics = data.topics.filter((t) => t.course_code === code);
  const attempts = data.attempts.filter((a) => a.course_code === code);

  // Per-topic accuracy from every answered question (topic checks and tests), weighting recent attempts x2
  const stats: TopicStat[] = topics.map((t) => {
    let correct = 0, total = 0, n = 0;
    attempts.forEach((a, idx) => {
      const w = idx >= attempts.length - 5 ? 2 : 1;
      const mine = a.answers.filter((x) => (x.topic_id ?? a.topic_id) === t.id);
      if (mine.length) n++;
      mine.forEach((x) => { total += w; if (x.correct) correct += w; });
    });
    return { topic: t, correct, total, attempts: n, pct: total ? Math.round((correct / total) * 100) : null };
  });
  const tested = stats.filter((s) => s.pct !== null);
  const overall = tested.length ? Math.round(tested.reduce((s, x) => s + (x.pct as number), 0) / tested.length) : null;
  const strengths = tested.filter((s) => (s.pct as number) >= 80).sort((a, b) => (b.pct as number) - (a.pct as number));
  const weak = tested.filter((s) => (s.pct as number) < 60).sort((a, b) => (a.pct as number) - (b.pct as number));
  const untested = stats.filter((s) => s.pct === null);
  const recent = attempts.slice(-10);
  const href = (id: string) => `/courses/${slugCode(code!)}/book/${encodeURIComponent(id)}`;

  return (
    <div>
      <PageHeader title="Performance" subtitle="Your progress, strengths and weak areas for each course. Only you can see your scores." />
      <div className="mb-6 flex flex-wrap gap-2">
        {data.courses.map((c) => (
          <button key={c.code} onClick={() => setSel(c.code)} className={c.code === code ? "btn" : "btn-ghost"}>{c.code}</button>
        ))}
      </div>
      {!course ? null : !topics.length ? <Empty title={`No topics in ${course.code} yet`}>Your progress will show here once the course book has topics.</Empty> : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card"><div className="muted text-xs uppercase">Overall understanding</div>
              <div className="mt-1 text-3xl font-semibold">{overall === null ? "–" : `${overall}%`}</div>
              {overall !== null && <Pill tone={rating(overall).tone}>{rating(overall).label}</Pill>}</div>
            <div className="card"><div className="muted text-xs uppercase">Topics checked</div>
              <div className="mt-1 text-3xl font-semibold">{tested.length}<span className="muted text-lg">/{topics.length}</span></div></div>
            <div className="card"><div className="muted text-xs uppercase">Quizzes and tests taken</div>
              <div className="mt-1 text-3xl font-semibold">{attempts.length}</div></div>
          </div>

          <div className="card">
            <h2 className="font-semibold">By topic</h2>
            <ul className="mt-3 space-y-3">
              {stats.map((s) => (
                <li key={s.topic.id}>
                  <div className="flex justify-between text-sm">
                    <Link href={href(s.topic.id)} className="hover:underline">{s.topic.position}. {s.topic.title}</Link>
                    <span className="muted">{s.pct === null ? "Not checked" : `${s.pct}%`}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    {s.pct !== null && <div className={`h-full ${s.pct >= 80 ? "bg-emerald-500" : s.pct >= 60 ? "bg-sky-500" : s.pct >= 40 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${Math.max(s.pct, 3)}%` }} />}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card"><h2 className="font-semibold">Strengths</h2>
              {strengths.length ? <ul className="mt-2 list-disc pl-5 text-sm">{strengths.map((s) => <li key={s.topic.id}>{s.topic.title} ({s.pct}%)</li>)}</ul>
                : <p className="muted mt-2 text-sm">Topics you score 80% or more on will show here.</p>}</div>
            <div className="card"><h2 className="font-semibold">Needs improvement</h2>
              {weak.length ? <ul className="mt-2 space-y-1 text-sm">{weak.map((s) => <li key={s.topic.id}><Link className="text-brand-600 hover:underline" href={href(s.topic.id)}>{s.topic.title}</Link> <span className="muted">({s.pct}%)</span></li>)}</ul>
                : <p className="muted mt-2 text-sm">No weak topics so far.</p>}</div>
          </div>

          <div className="card">
            <h2 className="font-semibold">What to do next</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {weak[0] && <li>Re-read <Link className="text-brand-600 hover:underline" href={href(weak[0].topic.id)}>{weak[0].topic.title}</Link>, go through its flashcards, then retake its quiz.</li>}
              {untested.length > 0 && <li>You haven't checked {untested.length} topic{untested.length > 1 ? "s" : ""} yet. Start with <Link className="text-brand-600 hover:underline" href={href(untested[0].topic.id)}>{untested[0].topic.title}</Link>.</li>}
              {tested.length >= 2 && <li>Take a mixed <Link className="text-brand-600 hover:underline" href={`/tests/${slugCode(code!)}`}>{course.code} test</Link> to practise switching between topics, which is how exams work.</li>}
              {!weak.length && !untested.length && tested.length > 0 && <li>You're in good shape. Keep a weekly mixed test going so it sticks.</li>}
            </ul>
          </div>

          {recent.length > 0 && (
            <div className="card">
              <h2 className="font-semibold">Recent results</h2>
              <div className="mt-3 flex h-28 items-end gap-2">
                {recent.map((a) => {
                  const p = Math.round((a.score / a.total) * 100);
                  return (
                    <div key={a.id} className="flex flex-1 flex-col items-center gap-1" title={`${p}% · ${new Date(a.created_at).toLocaleDateString("en-GB")}`}>
                      <span className="muted text-[10px]">{p}%</span>
                      <div className="w-full rounded-t bg-brand-500" style={{ height: `${Math.max(p, 3) * 0.8}px` }} />
                    </div>
                  );
                })}
              </div>
              <p className="muted mt-2 text-xs">Last {recent.length} quizzes and tests, oldest to newest.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
