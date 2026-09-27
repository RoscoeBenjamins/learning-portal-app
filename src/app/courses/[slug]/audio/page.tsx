"use client";
import Link from "next/link";
import { getCourseBySlug, getTopics } from "@/lib/courses";
import { useData } from "@/lib/useData";
import { CourseNav } from "@/components/CourseNav";
import { AudioOverview } from "@/components/AudioOverview";
import { Empty, ErrorBox, Loading, NOT_YET, PageHeader } from "@/components/ui";

export default function Audio({ params }: { params: { slug: string } }) {
  const { data, error, loading } = useData(async () => {
    const course = await getCourseBySlug(params.slug);
    return { course, topics: (await getTopics(course.code)).filter((t) => t.audio_script.trim()) };
  }, [params.slug]);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "Not found"} />;
  return (
    <div>
      <PageHeader back={{ href: `/courses/${params.slug}`, label: data.course.code }} title="Audio overviews"
        subtitle="A short spoken overview of each topic, a few minutes each. Uses your device's built-in voice." />
      <CourseNav slug={params.slug} />
      {!data.topics.length ? <Empty title="No audio overviews yet">{NOT_YET}</Empty> : (
        <div className="space-y-4">
          {data.topics.map((t) => (
            <div key={t.id}>
              <AudioOverview script={t.audio_script} title={`${t.position}. ${t.title}`} />
              <Link href={`/courses/${params.slug}/book/${encodeURIComponent(t.id)}`} className="mt-1 inline-block text-sm text-brand-600 hover:underline">Read the full section →</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
