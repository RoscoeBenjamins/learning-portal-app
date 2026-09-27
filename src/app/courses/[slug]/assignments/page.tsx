"use client";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { getCourseBySlug, getTopics } from "@/lib/courses";
import { q, useData } from "@/lib/useData";
import type { Assignment, DraftFeedback } from "@/lib/types";
import { CourseNav } from "@/components/CourseNav";
import { Markdown } from "@/components/Markdown";
import { Empty, ErrorBox, Loading, PageHeader } from "@/components/ui";

export default function Assignments({ params }: { params: { slug: string } }) {
  const { data, error, loading } = useData(async () => {
    const course = await getCourseBySlug(params.slug);
    const [assignments, topics] = await Promise.all([
      q<Assignment[]>(supabase().from("assignments").select("*").eq("course_code", course.code).order("due_date", { ascending: true, nullsFirst: false })),
      getTopics(course.code),
    ]);
    const ids = assignments.map((a) => a.id);
    const feedback = ids.length ? await q<DraftFeedback[]>(supabase().from("draft_feedback").select("*").in("assignment_id", ids).order("created_at", { ascending: false })) : [];
    return { course, assignments, topics, feedback };
  }, [params.slug]);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "Not found"} />;
  const { course, assignments, topics, feedback } = data;
  const title = (id: string) => topics.find((t) => t.id === id)?.title ?? id;

  return (
    <div>
      <PageHeader back={{ href: `/courses/${params.slug}`, label: course.code }} title="Assignments" />
      <CourseNav slug={params.slug} />

      <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
        <p className="font-semibold">Use this as a guide, not as your answer.</p>
        <p className="mt-1">Each breakdown explains what the question is asking, which topics it draws on, how to structure your answer, and walks through a <em>similar</em> example. Write your own answer in your own words, and follow your lecturer's rules on AI use. Submitting generated text as your own can count as academic misconduct.</p>
        <p className="mt-2">Want feedback? Put your own draft in this course's <b>Assignment</b> Drive folder with a name starting <code>MY DRAFT -</code>. Feedback appears here after the next portal update.</p>
      </div>

      {!assignments.length ? <Empty title="No assignments posted yet">When your lecturer posts one, add it to this course's Assignment folder in Drive.</Empty> : (
        <div className="space-y-6">
          {assignments.map((a) => (
            <details key={a.id} className="card" open={assignments.length === 1}>
              <summary className="cursor-pointer">
                <span className="text-lg font-semibold">{a.title}</span>
                {a.due_date && <span className="muted ml-2 text-sm">Due {new Date(a.due_date).toLocaleDateString("en-GB")}</span>}
              </summary>
              {a.brief_md && (<><h3 className="mt-4 font-semibold">What was asked</h3><Markdown>{a.brief_md}</Markdown></>)}
              <h3 className="mt-6 font-semibold">Guided breakdown</h3>
              <Markdown>{a.breakdown_md}</Markdown>
              {a.related_topics.length > 0 && (
                <div className="mt-4 text-sm">
                  <span className="font-medium">Revise first: </span>
                  {a.related_topics.map((id, i) => (
                    <span key={id}>{i > 0 && ", "}<Link className="text-brand-600 hover:underline" href={`/courses/${params.slug}/book/${encodeURIComponent(id)}`}>{title(id)}</Link></span>
                  ))}
                </div>
              )}
              {feedback.filter((f) => f.assignment_id === a.id).map((f) => (
                <div key={f.id} className="mt-6 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                  <h3 className="font-semibold">Feedback on "{f.draft_name}"</h3>
                  <p className="muted text-xs">{new Date(f.created_at).toLocaleString("en-GB")}</p>
                  <Markdown>{f.feedback_md}</Markdown>
                </div>
              ))}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
