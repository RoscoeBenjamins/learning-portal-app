"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { q } from "@/lib/useData";
import { track } from "@/lib/track";
import { slugCode } from "@/lib/types";
import { courseColor } from "@/lib/courseColors";

type Doc = { kind: "Topic" | "Flashcard" | "Assignment"; course: string; title: string; text: string; href: string };
type Hit = Doc & { score: number; snippet: string };

let cache: Promise<Doc[]> | null = null;

/** Loads all course content once per page session and flattens it into searchable docs. */
function loadDocs(): Promise<Doc[]> {
  if (cache) return cache;
  cache = (async () => {
    const db = supabase();
    const [topics, cards, asg] = await Promise.all([
      q<{ id: string; course_code: string; title: string; summary: string | null; content_md: string; key_terms: { term: string; meaning: string }[] }[]>(
        db.from("topics").select("id,course_code,title,summary,content_md,key_terms")),
      q<{ topic_id: string; front: string; back: string }[]>(db.from("flashcards").select("topic_id,front,back")),
      q<{ id: string; course_code: string; title: string; brief_md: string }[]>(db.from("assignments").select("id,course_code,title,brief_md")),
    ]);
    const topicHref = (code: string, id: string) => `/courses/${slugCode(code)}/book/${encodeURIComponent(id)}`;
    const byId = new Map(topics.map((t) => [t.id, t]));
    const docs: Doc[] = [];
    for (const t of topics) {
      const terms = (t.key_terms ?? []).map((k) => `${k.term}: ${k.meaning}`).join(" · ");
      docs.push({ kind: "Topic", course: t.course_code, title: t.title, text: [t.summary, terms, plain(t.content_md)].filter(Boolean).join(" \n "), href: topicHref(t.course_code, t.id) });
    }
    for (const c of cards) {
      const t = byId.get(c.topic_id);
      if (t) docs.push({ kind: "Flashcard", course: t.course_code, title: c.front, text: `${c.back} (from ${t.title})`, href: topicHref(t.course_code, t.id) });
    }
    for (const a of asg) docs.push({ kind: "Assignment", course: a.course_code, title: a.title, text: plain(a.brief_md), href: `/courses/${slugCode(a.course_code)}/assignments` });
    return docs;
  })();
  cache.catch(() => { cache = null; });
  return cache;
}

/** Strip markdown / mermaid noise so snippets read cleanly. */
function plain(md: string | null) {
  return (md ?? "")
    .replace(/```mermaid[\s\S]*?```/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`|~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

function search(docs: Doc[], query: string, course?: string): Hit[] {
  const words = norm(query).split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return [];
  const hits: Hit[] = [];
  for (const d of docs) {
    if (course && d.course !== course) continue;
    const title = norm(d.title), text = norm(d.text);
    let score = 0;
    let ok = true;
    for (const w of words) {
      const inTitle = title.includes(w), inText = text.includes(w);
      if (!inTitle && !inText) { ok = false; break; }
      score += (inTitle ? 10 : 0) + (inText ? 1 + Math.min(4, text.split(w).length - 2) : 0);
    }
    if (!ok) continue;
    if (title.includes(norm(query.trim()))) score += 15;
    if (d.kind === "Topic") score += 3;
    hits.push({ ...d, score, snippet: snippet(d.text, words) });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 25);
}

function snippet(text: string, words: string[]) {
  const t = norm(text);
  const i = Math.min(...words.map((w) => t.indexOf(w)).filter((x) => x >= 0), Infinity);
  if (!isFinite(i)) return text.slice(0, 140);
  let start = Math.max(0, i - 60);
  if (start > 0) { const sp = text.indexOf(" ", start); if (sp > -1 && sp < i) start = sp + 1; }
  return (start > 0 ? "…" : "") + text.slice(start, start + 170).trim() + (start + 170 < text.length ? "…" : "");
}

function Mark({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return <>{text.split(re).map((p, i) => (i % 2 ? <mark key={i} className="rounded bg-[#FFD60A]/50 px-0.5 text-inherit dark:bg-[#FFD60A]/30">{p}</mark> : p))}</>;
}

export function CourseSearch({ course, placeholder }: { course?: string; placeholder?: string }) {
  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [debounced, setDebounced] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const ensure = () => { if (!docs) loadDocs().then(setDocs, (e) => setErr(e?.message ?? "Could not load content")); };
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(query), 180);
    return () => clearTimeout(timer.current);
  }, [query]);
  useEffect(() => { if (debounced.trim().length > 1) { ensure(); track("search", course ?? "all", { q: debounced.slice(0, 60) }); } }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  const words = useMemo(() => norm(debounced).split(/\s+/).filter((w) => w.length > 1), [debounced]);
  const hits = useMemo(() => (docs ? search(docs, debounced, course) : []), [docs, debounced, course]);
  const active = debounced.trim().length > 1;

  return (
    <div className="mb-6">
      <div role="search" className="relative">
        <label htmlFor={`search-${course ?? "all"}`} className="sr-only">Search course work</label>
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E8E93]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <input id={`search-${course ?? "all"}`} type="text" inputMode="search" autoComplete="off" enterKeyHint="search"
          className="input pl-11 pr-11" placeholder={placeholder ?? "Search topics, key terms, flashcards, assignments…"}
          value={query} onFocus={ensure} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") setQuery(""); }} />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search"
            className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-[#8E8E93] hover:text-ink dark:hover:text-white">
            <span aria-hidden className="text-[18px]">×</span>
          </button>
        )}
      </div>

      {active && (
        <div className="mt-3" aria-live="polite">
          {err ? <p className="text-[14px] text-[#C4221A] dark:text-[#FF453A]">Search failed: {err}</p>
            : !docs ? <p className="muted animate-pulse text-[14px]">Searching…</p>
            : !hits.length ? <p className="muted text-[14px]">No matches for “{debounced.trim()}”{course ? " in this course" : ""}. Try fewer or different words.</p>
            : (
              <>
                <p className="muted mb-2 text-[13px]">{hits.length === 25 ? "Top 25" : hits.length} result{hits.length === 1 ? "" : "s"}</p>
                <ul className="card divide-y divide-[var(--line)] p-0">
                  {hits.map((h, i) => (
                    <li key={`${h.href}-${i}`}>
                      <Link href={h.href} onClick={() => track("search_open", h.href, { kind: h.kind })} className="block min-h-[44px] px-5 py-3 transition hover:bg-black/[.03] dark:hover:bg-white/[.05]">
                        <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold">
                          {!course && <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: courseColor(h.course) }} aria-hidden />{h.course}</span>}
                          <span className={`pill ${h.kind === "Topic" ? "tone-ok" : h.kind === "Assignment" ? "tone-warn" : "tone-none"}`}>{h.kind}</span>
                        </div>
                        <div className="mt-1 text-[15px] font-medium"><Mark text={h.title} words={words} /></div>
                        <div className="muted mt-0.5 line-clamp-2 text-[13px]"><Mark text={h.snippet} words={words} /></div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
        </div>
      )}
    </div>
  );
}
