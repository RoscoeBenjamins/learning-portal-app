"use client";
import Link from "next/link";
import { getCourseBySlug, getTopics } from "@/lib/courses";
import { useData } from "@/lib/useData";
import { CourseNav } from "@/components/CourseNav";
import { Empty, ErrorBox, Loading, NOT_YET, PageHeader } from "@/components/ui";

export default function CoursePage({ params }: { params: { slug: string } }) {
  const { data, error, loading } = useData(async () => {
    const course = await getCourseBySlug(params.slug);
    return { course, topics: await getTopics(course.code) };
  }, [params.slug]);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "Not found"} />;
  const { course, topics } = data;
  return (
    <div>
      <PageHeader back={{ href: "/", label: "All courses" }} title={`${course.code}: ${course.title}`}
        subtitle={<>{course.lecturer}{course.schedule ? ` · ${course.schedule}` : ""}{course.venue ? ` · Venue ${course.venue}` : ""}</>} />
      <CourseNav slug={params.slug} />
      {!topics.length ? <Empty title="No topics yet">{NOT_YET}</Empty> : (
        <ol className="space-y-3">
          {topics.map((t) => (
            <li key={t.id}>
              <Link href={`/courses/${params.slug}/book/${encodeURIComponent(t.id)}`} className="card-link flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-100">{t.position}</span>
                <span>
                  <span className="block font-medium">{t.title}</span>
                  {t.summary && <span className="muted mt-0.5 block text-sm">{t.summary}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
