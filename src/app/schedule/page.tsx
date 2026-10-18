"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { q, useData } from "@/lib/useData";
import { getCourses } from "@/lib/courses";
import { track } from "@/lib/track";
import type { AcademicBreak, Assignment, Course, DeliveryMode, LectureBlock } from "@/lib/types";
import { courseColor } from "@/lib/courseColors";
import { ErrorBox, Loading, PageHeader, Pill } from "@/components/ui";
import {
  addDays, buildIcs, classEvents, currentOrNext, dayName, downloadIcs, fmtDate, fmtTime,
  googleLink, previousLecture, todayAccra, type ClassEvent,
} from "@/lib/calendar";

const FACULTIES: { id: string; name: string }[] = [
  { id: "business", name: "Business School" },
  { id: "focisMasters", name: "FoCIS Masters" },
  { id: "focisPhd", name: "FoCIS PhD" },
];

function ModePill({ mode }: { mode: DeliveryMode }) {
  if (mode === "Face-to-Face") return <Pill tone="warn"><span aria-hidden>▲&nbsp;</span>Face-to-Face</Pill>;
  if (mode === "Virtual") return <Pill tone="ok"><span aria-hidden>◎&nbsp;</span>Virtual</Pill>;
  return <Pill tone="none"><span aria-hidden>–&nbsp;</span>No lectures</Pill>;
}
const range = (b: LectureBlock) => `${fmtDate(b.start_date, { day: "numeric", month: "short" })} – ${fmtDate(b.end_date, { day: "numeric", month: "short", year: "numeric" })}`;

export default function SchedulePage() {
  const { data, error, loading } = useData(async () => {
    const [courses, blocks, breaks, assignments] = await Promise.all([
      getCourses(),
      q<LectureBlock[]>(supabase().from("lecture_blocks").select("*").order("start_date")),
      q<AcademicBreak[]>(supabase().from("academic_breaks").select("*").order("start_date")),
      q<Assignment[]>(supabase().from("assignments").select("id,course_code,title,due_date")),
    ]);
    return { courses, blocks, breaks, assignments };
  });
  const [showAll, setShowAll] = useState(false);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "No data"} />;

  const { courses, blocks, breaks, assignments } = data;
  const scheduled = courses.filter((c) => c.class_day);
  const events = classEvents(blocks, scheduled);
  const today = todayAccra();
  const cur = currentOrNext(blocks, today);
  const inBreak = breaks.find((b) => b.start_date <= today && (!b.end_date || b.end_date >= today));
  const upcoming = blocks.filter((b) => b.end_date >= today);
  const past = blocks.filter((b) => b.end_date < today);
  const due = assignments.filter((a) => a.due_date && a.due_date >= today).sort((a, b) => a.due_date!.localeCompare(b.due_date!));

  const dlAll = () => {
    track("calendar_download", "full");
    downloadIcs("gctu-semester.ics", buildIcs(events, assignments, breaks, "GCTU MSc IT – Semester"));
  };
  const dlBlock = (b: LectureBlock) => {
    track("calendar_download", b.id);
    downloadIcs(`gctu-${b.start_date}.ics`, buildIcs(events.filter((e) => e.block.id === b.id), [], [], `GCTU ${range(b)}`));
  };

  return (
    <div>
      <div className="eyebrow">FoCIS Masters · Africa/Accra time</div>
      <PageHeader title="Schedule" subtitle="Weekend lectures, delivery mode and calendar reminders (2 days, 1 day and 1 hour before)." />

      <div className="mb-6 flex flex-wrap gap-2">
        <button className="btn" onClick={dlAll}>Download full semester (.ics)</button>
      </div>

      {inBreak && (
        <div className="card mb-4">
          <div className="eyebrow">Now</div>
          <div className="mt-1 text-[19px] font-semibold">{inBreak.label}</div>
          {inBreak.note && <p className="muted mt-1 text-[14px]">{inBreak.note}</p>}
        </div>
      )}

      {cur ? <ThisWeekend block={cur} prev={previousLecture(blocks, cur)} events={events.filter((e) => e.block.id === cur.id)} today={today} onDownload={() => dlBlock(cur)} />
        : !inBreak && <div className="card mb-6"><p className="font-medium">No more lecture weekends this semester.</p></div>}

      {due.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-[20px] font-semibold tracking-tight">Assignment deadlines</h2>
          <ul className="card divide-y divide-[var(--line)] p-0">
            {due.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-[15px]">
                <span><span className="font-semibold">{a.course_code}</span> · {a.title}</span>
                <span className="muted">{fmtDate(a.due_date!)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-[20px] font-semibold tracking-tight">Weekly timetable</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["sat", "sun", "fri"] as const).map((d) => {
            const list = scheduled.filter((c) => c.class_day === d).sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
            if (!list.length) return null;
            return (
              <div key={d} className="card">
                <div className="eyebrow mb-2">{dayName(d)}</div>
                <ul className="space-y-3">{list.map((c) => <ClassRow key={c.code} c={c} />)}</ul>
              </div>
            );
          })}
        </div>
        <p className="muted mt-2 text-[13px]">No Friday classes in the current timetable. Venues and meeting links will be added when confirmed.</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-[20px] font-semibold tracking-tight">Upcoming weekends</h2>
        <ul className="space-y-3">
          {upcoming.map((b) => <BlockRow key={b.id} b={b} current={b.id === cur?.id} onDownload={() => dlBlock(b)} />)}
        </ul>
        {past.length > 0 && (
          <details className="mt-4">
            <summary className="min-h-[44px] cursor-pointer content-center text-[15px] text-brand-600 dark:text-[#2997FF]">Past weekends ({past.length})</summary>
            <ul className="mt-2 space-y-3 opacity-70">{past.map((b) => <BlockRow key={b.id} b={b} past />)}</ul>
          </details>
        )}
      </section>

      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[20px] font-semibold tracking-tight">Delivery mode – all faculties</h2>
          <button className="btn-ghost" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>{showAll ? "Hide" : "Show"}</button>
        </div>
        {showAll && (
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[320px] text-left text-[14px]">
              <thead><tr className="border-b border-[var(--line)]"><th className="px-4 py-3">Weekend</th>{FACULTIES.map((f) => <th key={f.id} className="px-3 py-3">{f.name}</th>)}</tr></thead>
              <tbody>
                {blocks.map((b) => (
                  <tr key={b.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="whitespace-nowrap px-4 py-2.5">{fmtDate(b.start_date, { day: "numeric", month: "short" })}</td>
                    {FACULTIES.map((f) => <td key={f.id} className="px-3 py-2.5">{short(b.modes[f.id])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted mt-2 text-[13px]">Faculty of Engineering programmes are 100% in person, Monday–Friday, evenings only. Further changes will be announced.</p>
      </section>

      {breaks.length > 0 && (
        <section>
          <h2 className="mb-3 text-[20px] font-semibold tracking-tight">Breaks & exams</h2>
          <ul className="card divide-y divide-[var(--line)] p-0">
            {breaks.map((b) => (
              <li key={b.label} className="px-5 py-3 text-[15px]">
                <div className="font-semibold">{b.label}</div>
                <div className="muted text-[14px]">From {fmtDate(b.start_date)}{b.end_date ? ` to ${fmtDate(b.end_date)}` : ""}{b.note ? ` · ${b.note.replace(/\s*\[CONFIRM[^\]]*\]/g, "")}` : ""}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

const short = (m?: DeliveryMode) => (m === "Face-to-Face" ? "▲ In person" : m === "Virtual" ? "◎ Virtual" : "– N/A");

function ClassRow({ c }: { c: Course }) {
  return (
    <li className="flex gap-3">
      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: courseColor(c.code) }} aria-hidden />
      <div className="min-w-0">
        <div className="text-[15px] font-semibold">{fmtTime(c.start_time)}–{fmtTime(c.end_time)} · {c.code}</div>
        <div className="text-[15px]">{c.title}</div>
        <div className="muted text-[13px]">{[c.lecturer, c.venue && `Venue ${c.venue}`].filter(Boolean).join(" · ")}</div>
      </div>
    </li>
  );
}

function ThisWeekend({ block, prev, events, today, onDownload }: { block: LectureBlock; prev: LectureBlock | null; events: ClassEvent[]; today: string; onDownload: () => void }) {
  const live = block.start_date <= today;
  const changed = prev && block.mode !== "N/A" && prev.mode !== block.mode;
  const days = Math.round((Date.parse(block.start_date) - Date.parse(today)) / 864e5);
  return (
    <section className="card mb-8">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="eyebrow">{live ? "This weekend" : days <= 1 ? "Starts tomorrow" : `Next weekend · in ${days} days`}</div>
          <div className="mt-1 text-[22px] font-semibold tracking-tight">{range(block)}</div>
        </div>
        <ModePill mode={block.mode} />
      </div>
      {changed && (
        <p role="status" className="mt-3 rounded-xl bg-[#FF9500]/15 px-3.5 py-2.5 text-[14px] text-[#9A5700] dark:text-[#FF9F0A]">
          Heads up: mode changes from {prev!.mode} last weekend to <b>{block.mode}</b>.
        </p>
      )}
      {block.mode === "N/A" ? <p className="muted mt-3 text-[15px]">No FoCIS Masters lectures this weekend.</p> : (
        <ul className="mt-4 divide-y divide-[var(--line)]">
          {events.map((e) => (
            <li key={e.uid} className={`flex flex-wrap items-center justify-between gap-2 py-3 ${e.date < today ? "opacity-60" : ""}`}>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold" style={{ color: courseColor(e.course.code) }}>{fmtDate(e.date, { weekday: "long" })} · {fmtTime(e.course.start_time)}–{fmtTime(e.course.end_time)}</div>
                <div className="text-[15px] font-medium">{e.course.code} · {e.course.title}</div>
                <div className="muted text-[13px]">{e.course.lecturer}{e.course.venue && block.mode === "Face-to-Face" ? ` · Venue ${e.course.venue}` : ""}</div>
              </div>
              <a href={googleLink(e)} target="_blank" rel="noopener noreferrer" className="btn-ghost px-4 text-[14px]">Google Calendar</a>
            </li>
          ))}
        </ul>
      )}
      {block.mode !== "N/A" && <button className="btn-ghost mt-3" onClick={onDownload}>Add this weekend (.ics)</button>}
    </section>
  );
}

function BlockRow({ b, current, past, onDownload }: { b: LectureBlock; current?: boolean; past?: boolean; onDownload?: () => void }) {
  return (
    <li className={`card flex flex-wrap items-center justify-between gap-3 py-4 ${current ? "ring-2 ring-brand-500/40" : ""}`}>
      <div>
        <div className="text-[16px] font-semibold">{range(b)}</div>
        <div className="muted text-[13px]">Fri {fmtDate(b.start_date, { day: "numeric" })} · Sat {fmtDate(addDays(b.start_date, 1), { day: "numeric" })} · Sun {fmtDate(b.end_date, { day: "numeric" })}</div>
      </div>
      <div className="flex items-center gap-2">
        <ModePill mode={b.mode} />
        {!past && b.mode !== "N/A" && onDownload && <button className="btn-ghost px-4 text-[14px]" onClick={onDownload} aria-label={`Add weekend ${range(b)} to calendar`}>.ics</button>}
      </div>
    </li>
  );
}
