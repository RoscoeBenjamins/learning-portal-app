"use client";
import { supabase } from "@/lib/supabase-browser";
import { getCourseBySlug, getTopics } from "@/lib/courses";
import { q, useData } from "@/lib/useData";
import type { Assignment, DraftFeedback } from "@/lib/types";
import { CourseNav } from "@/components/CourseNav";
import { AssignmentCard } from "@/components/AssignmentCard";
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

      <p className="muted mb-6 max-w-2xl text-[15px] leading-relaxed">Guides to help you write your own answer. Follow your lecturer's rules on AI use — handing in generated text as your own can count as academic misconduct.</p>

      {!assignments.length ? <Empty title="No assignments posted yet">When your lecturer posts one, add it to this course's Assignment folder in Drive.</Empty> : (
        <div className="space-y-6">
          {assignments.map((a) => (
            <AssignmentCard key={a.id} a={a} slug={params.slug} topicTitle={title} feedback={feedback.filter((f) => f.assignment_id === a.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
