"use client";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { getCourseBySlug, getTopics } from "@/lib/courses";
import { q, useData } from "@/lib/useData";
import type { Flashcard, Question } from "@/lib/types";
import { CourseNav } from "@/components/CourseNav";
import { Markdown } from "@/components/Markdown";
import { Flashcards } from "@/components/Flashcards";
import { Quiz } from "@/components/Quiz";
import { AudioOverview } from "@/components/AudioOverview";
import { ErrorBox, Loading, PageHeader } from "@/components/ui";

export default function TopicPage({ params }: { params: { slug: string; topicId: string } }) {
  const topicId = decodeURIComponent(params.topicId);
  const { data, error, loading } = useData(async () => {
    const course = await getCourseBySlug(params.slug);
    const topics = await getTopics(course.code);
    const i = topics.findIndex((t) => t.id === topicId);
    if (i < 0) throw new Error("Topic not found");
    const [cards, questions] = await Promise.all([
      q<Flashcard[]>(supabase().from("flashcards").select("*").eq("topic_id", topicId).order("position")),
      q<Question[]>(supabase().from("questions").select("*").eq("topic_id", topicId).order("position")),
    ]);
    return { course, topic: topics[i], prev: topics[i - 1], next: topics[i + 1], cards, questions };
  }, [params.slug, topicId]);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "Not found"} />;
  const { course, topic, prev, next, cards, questions } = data;
  const link = (id: string) => `/courses/${params.slug}/book/${encodeURIComponent(id)}`;

  return (
    <div>
      <PageHeader back={{ href: `/courses/${params.slug}/book`, label: `${course.code} course book` }}
        title={`${topic.position}. ${topic.title}`} subtitle={topic.summary ?? undefined} />
      <CourseNav slug={params.slug} />

      <article className="card"><Markdown>{topic.content_md}</Markdown></article>

      {topic.key_terms.length > 0 && (
        <section className="card mt-6">
          <h2 className="font-semibold">Key terms</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {topic.key_terms.map((k) => (
              <div key={k.term}><dt className="text-sm font-medium">{k.term}</dt><dd className="muted text-sm">{k.meaning}</dd></div>
            ))}
          </dl>
        </section>
      )}

      {topic.audio_script && (
        <section className="mt-6"><AudioOverview script={topic.audio_script} title="Listen: topic overview" /></section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Check yourself: flashcards</h2>
        <div className="card"><Flashcards cards={cards} /></div>
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-lg font-semibold">Check yourself: quick quiz</h2>
        <p className="muted mb-3 text-sm">Answer all questions to get your understanding rating. Your score goes into the Performance page.</p>
        <Quiz questions={questions} courseCode={course.code} topicId={topic.id} mode="topic_check" topicTitles={{ [topic.id]: topic.title }} />
      </section>

      {topic.source_files.length > 0 && (
        <p className="muted mt-8 text-xs">Based on: {topic.source_files.map((f) => f.name).join(", ")}</p>
      )}

      <div className="mt-8 flex justify-between gap-2">
        {prev ? <Link className="btn-ghost" href={link(prev.id)}>← {prev.title}</Link> : <span />}
        {next ? <Link className="btn" href={link(next.id)}>{next.title} →</Link> : <span />}
      </div>
    </div>
  );
}
