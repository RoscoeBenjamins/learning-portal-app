"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Question } from "@/lib/types";
import { rating, slugCode } from "@/lib/types";
import { supabase } from "@/lib/supabase-browser";
import { Pill } from "./ui";

type Props = {
  questions: Question[];
  courseCode: string;
  topicId: string | null;               // null for a whole-course test
  mode: "topic_check" | "test";
  topicTitles?: Record<string, string>; // for linking wrong answers back to topics
  onDone?: () => void;
};

export function Quiz({ questions, courseCode, topicId, mode, topicTitles = {}, onDone }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const score = useMemo(() => questions.filter((q) => answers[q.id] === q.answer_index).length, [answers, questions]);
  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;
  const r = rating(pct);
  const wrong = questions.filter((q) => answers[q.id] !== q.answer_index);

  if (!questions.length) return <p className="muted text-sm">No questions for this yet.</p>;

  const submit = async () => {
    setSubmitted(true);
    const { error } = await supabase().from("attempts").insert({
      course_code: courseCode, topic_id: topicId, mode, score, total: questions.length,
      answers: questions.map((q) => ({ question_id: q.id, topic_id: q.topic_id, chosen: answers[q.id] ?? -1, correct: answers[q.id] === q.answer_index })),
    });
    if (error) setSaveErr(error.message);
    onDone?.();
  };
  const reset = () => { setAnswers({}); setSubmitted(false); setSaveErr(null); };
  const topicHref = (tid: string) => `/courses/${slugCode(courseCode)}/book/${encodeURIComponent(tid)}`;

  return (
    <div className="space-y-5">
      {submitted && (
        <div className="card">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-3xl font-semibold">{pct}%</div>
            <div>
              <Pill tone={r.tone}>{r.label}</Pill>
              <div className="muted mt-1 text-sm">{score} of {questions.length} correct. {r.note}</div>
            </div>
          </div>
          {saveErr && <p className="mt-2 text-xs text-rose-600">Your score couldn't be saved ({saveErr}).</p>}
        </div>
      )}

      {questions.map((q, n) => {
        const chosen = answers[q.id];
        const isRight = chosen === q.answer_index;
        return (
          <div key={q.id} className="card">
            <p className="font-medium">{n + 1}. {q.question}</p>
            <div className="mt-3 space-y-2">
              {q.options.map((opt, oi) => {
                let cls = "border-slate-200 dark:border-slate-700";
                if (submitted && oi === q.answer_index) cls = "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30";
                else if (submitted && oi === chosen) cls = "border-rose-500 bg-rose-50 dark:bg-rose-900/30";
                else if (!submitted && oi === chosen) cls = "border-brand-500 bg-brand-50 dark:bg-brand-900/30";
                return (
                  <label key={oi} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${cls}`}>
                    <input type="radio" name={q.id} className="mt-0.5" disabled={submitted} checked={chosen === oi}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))} />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
            {submitted && !isRight && (
              <div className="mt-3 rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-800">
                <p><span className="font-medium">Why:</span> {q.explanation}</p>
                <Link href={topicHref(q.topic_id)} className="mt-2 inline-block text-brand-600 hover:underline">
                  Review: {topicTitles[q.topic_id] ?? "this topic"} →
                </Link>
              </div>
            )}
            {submitted && isRight && <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">Correct. {q.explanation}</p>}
          </div>
        );
      })}

      <div className="flex gap-2">
        {!submitted ? (
          <button className="btn" onClick={submit} disabled={Object.keys(answers).length < questions.length}>
            Submit answers ({Object.keys(answers).length}/{questions.length})
          </button>
        ) : (
          <button className="btn-ghost" onClick={reset}>Try again</button>
        )}
      </div>

      {submitted && wrong.length > 0 && mode === "test" && (
        <div className="card">
          <p className="font-medium">Topics to revisit</p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {[...new Set(wrong.map((w) => w.topic_id))].map((tid) => (
              <li key={tid}><Link className="text-brand-600 hover:underline" href={topicHref(tid)}>{topicTitles[tid] ?? tid}</Link></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
