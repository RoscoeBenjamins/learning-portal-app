"use client";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { getCourseBySlug, getTopics } from "@/lib/courses";
import { q, useData } from "@/lib/useData";
import type { Flashcard, Question } from "@/lib/types";
import { courseColor } from "@/lib/courseColors";
import { CourseNav } from "@/components/CourseNav";
import { Markdown, slugify } from "@/components/Markdown";
import { Flashcards } from "@/components/Flashcards";
import { Quiz } from "@/components/Quiz";
import { AudioOverview } from "@/components/AudioOverview";
import { ErrorBox, Loading } from "@/components/ui";

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
    return { course, topic: topics[i], total: topics.length, prev: topics[i - 1], next: topics[i + 1], cards, questions };
  }, [params.slug, topicId]);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "Not found"} />;
  const { course, topic, total, prev, next, cards, questions } = data;
  const link = (id: string) => `/courses/${params.slug}/book/${encodeURIComponent(id)}`;
  const color = courseColor(params.slug);
  const headings = Array.from(topic.content_md.matchAll(/^## (.+)$/gm)).map((m) => m[1].replace(/[*_`]/g, "").trim());
  const minutes = Math.max(1, Math.round(topic.content_md.split(/\s+/).length / 200));
  const steps = [
    { id: "read", label: "Read", show: true },
    { id: "listen", label: "Listen", show: !!topic.audio_script },
    { id: "flashcards", label: "Flashcards", show: cards.length > 0 },
    { id: "quiz", label: "Quiz", show: questions.length > 0 },
  ].filter((s) => s.show);

  return (
    <div>
      <Link href={`/courses/${params.slug}/book`} className="inline-flex min-h-[44px] items-center gap-1 text-[15px] text-brand-600 dark:text-[#2997FF]"><span aria-hidden>‹</span> {course.code} course book</Link>
      <CourseNav slug={params.slug} />

      <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12">
        <aside className="hidden lg:block">
          <nav aria-label="On this page" className="sticky top-20 space-y-6 text-[13px]">
            <div>
              <div className="eyebrow mb-2">Steps</div>
              <ol className="space-y-1">
                {steps.map((s, i) => (
                  <li key={s.id}><a href={`#${s.id}`} className="muted flex items-center gap-2 py-1 hover:text-ink dark:hover:text-white">
                    <span className="grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold" style={{ background: `${color}2E` }}>{i + 1}</span>{s.label}</a></li>
                ))}
              </ol>
            </div>
            {headings.length > 1 && (
              <div>
                <div className="eyebrow mb-2">In this topic</div>
                <ul className="space-y-1 border-l border-[var(--line)]">
                  {headings.map((h) => <li key={h}><a href={`#${slugify(h)}`} className="muted -ml-px block border-l-2 border-transparent py-1 pl-3 leading-snug hover:border-current hover:text-ink dark:hover:text-white">{h}</a></li>)}
                </ul>
              </div>
            )}
          </nav>
        </aside>

        <div className="min-w-0">
          <header id="read" className="mb-8 scroll-mt-20">
            <div className="muted flex items-center gap-2 text-[13px] font-semibold"><span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />Topic {topic.position} of {total} · {minutes} min read</div>
            <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.02em] sm:text-[34px]">{topic.title}</h1>
            {topic.summary && <p className="muted mt-3 text-[19px] leading-relaxed">{topic.summary}</p>}
          </header>

          <article className="card px-5 py-6 sm:px-10 sm:py-10"><div className="mx-auto max-w-[680px]"><Markdown>{topic.content_md}</Markdown></div></article>

          {topic.key_terms.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-4 text-[22px] font-bold tracking-tight">Key terms</h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                {topic.key_terms.map((k) => (
                  <div key={k.term} className="card p-4"><dt className="text-[15px] font-semibold">{k.term}</dt><dd className="muted mt-1 text-[15px] leading-snug">{k.meaning}</dd></div>
                ))}
              </dl>
            </section>
          )}

          {topic.audio_script && (
            <Step id="listen" n={steps.findIndex((s) => s.id === "listen") + 1} color={color} title="Listen to the overview">
              <AudioOverview script={topic.audio_script} title="Topic overview" />
            </Step>
          )}
          {cards.length > 0 && (
            <Step id="flashcards" n={steps.findIndex((s) => s.id === "flashcards") + 1} color={color} title="Test your memory">
              <Flashcards cards={cards} />
            </Step>
          )}
          {questions.length > 0 && (
            <Step id="quiz" n={steps.findIndex((s) => s.id === "quiz") + 1} color={color} title="Check your understanding" note="Your score feeds the Progress page.">
              <Quiz questions={questions} courseCode={course.code} topicId={topic.id} mode="topic_check" topicTitles={{ [topic.id]: topic.title }} />
            </Step>
          )}

          {topic.source_files.length > 0 && <p className="muted mt-10 text-[13px]">Based on: {topic.source_files.map((f) => f.name).join(", ")}</p>}

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {prev ? <Link className="card-link" href={link(prev.id)}><div className="muted text-[13px]">‹ Previous</div><div className="mt-1 font-semibold leading-snug">{prev.title}</div></Link> : <span />}
            {next && <Link className="card-link sm:text-right" href={link(next.id)}><div className="muted text-[13px]">Next ›</div><div className="mt-1 font-semibold leading-snug">{next.title}</div></Link>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ id, n, color, title, note, children }: { id: string; n: number; color: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-12 scroll-mt-20">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[15px] font-bold" style={{ background: `${color}2E`, boxShadow: `inset 0 0 0 1.5px ${color}` }}>{n}</span>
        <div><h2 className="text-[22px] font-bold leading-tight tracking-tight">{title}</h2>{note && <p className="muted text-[13px]">{note}</p>}</div>
      </div>
      <div className="card">{children}</div>
    </section>
  );
}
