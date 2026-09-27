"use client";
import Link from "next/link";
import { getCourseBySlug, getTopics } from "@/lib/courses";
import { useData } from "@/lib/useData";
import { CourseNav } from "@/components/CourseNav";
import { Empty, ErrorBox, Loading, NOT_YET, PageHeader } from "@/components/ui";

export default function Book({ params }: { params: { slug: string } }) {
  const { data, error, loading } = useData(async () => {
    const course = await getCourseBySlug(params.slug);
    return { course, topics: await getTopics(course.code) };
  }, [params.slug]);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "Not found"} />;
  const { course, topics } = data;
  const last = topics.reduce((m, t) => (t.updated_at > m ? t.updated_at : m), "");
  return (
    <div>
      <PageHeader back={{ href: `/courses/${params.slug}`, label: course.code }} title={`${course.title}: Course book`}
        subtitle={last ? `Last updated ${new Date(last).toLocaleDateString("en-GB")}. Grows as new lecture materials are added.` : undefined} />
      <CourseNav slug={params.slug} />
      {!topics.length ? <Empty title="The course book is empty for now">{NOT_YET}</Empty> : (
        <div className="card">
          <h2 className="font-semibold">Contents</h2>
          <ol className="mt-3 space-y-2">
            {topics.map((t) => (
              <li key={t.id} className="flex gap-3">
                <span className="muted w-6 text-right text-sm">{t.position}.</span>
                <div>
                  <Link className="font-medium text-brand-600 hover:underline" href={`/courses/${params.slug}/book/${encodeURIComponent(t.id)}`}>{t.title}</Link>
                  {t.summary && <p className="muted text-sm">{t.summary}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
