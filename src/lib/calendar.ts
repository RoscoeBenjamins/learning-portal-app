// Calendar export (RFC 5545 .ics + Google Calendar links). All times are Africa/Accra (UTC+0, no DST).
import type { AcademicBreak, Assignment, Course, LectureBlock, WeeklyLink } from "./types";

/** Where face-to-face classes happen (app_settings.campus_venue overrides this). */
let CAMPUS = "Graduate Block, GCTU Tesano campus";
export function setCampus(v?: string | null) { if (v) CAMPUS = v; }
export const campus = () => CAMPUS;

export const DAY_OFFSET: Record<string, number> = { fri: 0, sat: 1, sun: 2 };
const DAY_NAME: Record<string, string> = { fri: "Friday", sat: "Saturday", sun: "Sunday" };
export const dayName = (d: string | null) => (d ? DAY_NAME[d] ?? d : "");

/** "2026-10-23" + n days → "2026-10-24" (UTC = Accra time). */
export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const todayAccra = () => new Date().toISOString().slice(0, 10);
export const hm = (t: string | null) => (t ? t.slice(0, 5) : null);

export function fmtTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${ap}`;
}
export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
}

export type ClassEvent = { uid: string; date: string; course: Course; block: LectureBlock; link: string | null };

/** One event per scheduled class per lecture weekend (skips N/A weekends). */
export function classEvents(blocks: LectureBlock[], courses: Course[], links: WeeklyLink[] = []): ClassEvent[] {
  const out: ClassEvent[] = [];
  for (const b of blocks) {
    if (b.mode === "N/A") continue;
    for (const c of courses) {
      if (!c.class_day || DAY_OFFSET[c.class_day] === undefined) continue;
      const date = addDays(b.start_date, DAY_OFFSET[c.class_day]);
      const link = b.mode === "Virtual" ? links.find((l) => l.block_id === b.id && l.course_code === c.code)?.url ?? null : null;
      out.push({ uid: `${b.id}-${c.code.replace(/\s+/g, "").toLowerCase()}@learning-portal`, date, course: c, block: b, link });
    }
  }
  return out.sort((a, b) => (a.date + (a.course.start_time ?? "")).localeCompare(b.date + (b.course.start_time ?? "")));
}

// ---------- ICS ----------
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
function fold(line: string) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let cur = "", len = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (len + n > (parts.length ? 74 : 75)) { parts.push(cur); cur = ""; len = 0; }
    cur += ch; len += n;
  }
  parts.push(cur);
  return parts.join("\r\n ");
}
const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
const dt = (date: string, time: string) => `${date.replace(/-/g, "")}T${time.slice(0, 5).replace(":", "")}00`;
const alarm = (trigger: string, text: string) => ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(text)}`, `TRIGGER:${trigger}`, "END:VALARM"];

const VTZ = ["BEGIN:VTIMEZONE", "TZID:Africa/Accra", "BEGIN:STANDARD", "DTSTART:19700101T000000", "TZOFFSETFROM:+0000", "TZOFFSETTO:+0000", "TZNAME:GMT", "END:STANDARD", "END:VTIMEZONE"];

export function where(e: ClassEvent) {
  if (e.block.mode === "Virtual") return e.link ?? "Zoom (link is posted each week)";
  return `${CAMPUS}${e.course.venue ? ` (room ${e.course.venue})` : ""}`;
}

function classVevent(e: ClassEvent) {
  const c = e.course;
  const lines = ["BEGIN:VEVENT", `UID:${e.uid}`, `DTSTAMP:${stamp()}`];
  if (c.start_time && c.end_time) {
    lines.push(`DTSTART;TZID=Africa/Accra:${dt(e.date, c.start_time)}`, `DTEND;TZID=Africa/Accra:${dt(e.date, c.end_time)}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${e.date.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${addDays(e.date, 1).replace(/-/g, "")}`);
  }
  lines.push(
    `SUMMARY:${esc(`${c.code} ${c.title} (${e.block.mode})`)}`,
    `LOCATION:${esc(where(e))}`,
    `DESCRIPTION:${esc(`Lecturer: ${c.lecturer ?? "TBC"}\nMode: ${e.block.mode}${e.block.mode === "Virtual" ? `\nZoom: ${e.link ?? "link is posted each week on the portal Schedule page"}` : ""}`)}`,
    ...(e.link ? [`URL:${e.link}`] : []),
    ...alarm("-P2D", `${c.code} in 2 days`), ...alarm("-P1D", `${c.code} tomorrow`), ...alarm("-PT1H", `${c.code} in 1 hour`),
    "END:VEVENT",
  );
  return lines;
}

function assignmentVevent(a: Assignment) {
  const d = a.due_date!;
  return ["BEGIN:VEVENT", `UID:asg-${a.id}@learning-portal`, `DTSTAMP:${stamp()}`,
    `DTSTART;VALUE=DATE:${d.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${addDays(d, 1).replace(/-/g, "")}`,
    `SUMMARY:${esc(`Due: ${a.course_code} ${a.title}`)}`,
    ...alarm("-P7D", "Assignment due in 7 days"), ...alarm("-P2D", "Assignment due in 2 days"), ...alarm("-P1D", "Assignment due tomorrow"),
    "END:VEVENT"];
}

function breakVevent(b: AcademicBreak) {
  const end = b.end_date ?? b.start_date;
  return ["BEGIN:VEVENT", `UID:brk-${b.label.replace(/\W+/g, "-").toLowerCase()}@learning-portal`, `DTSTAMP:${stamp()}`,
    `DTSTART;VALUE=DATE:${b.start_date.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${addDays(end, 1).replace(/-/g, "")}`,
    `SUMMARY:${esc(b.label)}`, ...(b.note ? [`DESCRIPTION:${esc(b.note)}`] : []), "TRANSP:TRANSPARENT", "END:VEVENT"];
}

export function buildIcs(events: ClassEvent[], assignments: Assignment[] = [], breaks: AcademicBreak[] = [], name = "GCTU lectures") {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Learning Portal//GCTU Schedule//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(name)}`, "X-WR-TIMEZONE:Africa/Accra", ...VTZ];
  events.forEach((e) => lines.push(...classVevent(e)));
  assignments.filter((a) => a.due_date).forEach((a) => lines.push(...assignmentVevent(a)));
  breaks.forEach((b) => lines.push(...breakVevent(b)));
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadIcs(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Google Calendar "add event" link (Google applies the user's default reminders). */
export function googleLink(e: ClassEvent) {
  const c = e.course;
  const dates = c.start_time && c.end_time
    ? `${dt(e.date, c.start_time)}/${dt(e.date, c.end_time)}`
    : `${e.date.replace(/-/g, "")}/${addDays(e.date, 1).replace(/-/g, "")}`;
  const p = new URLSearchParams({
    action: "TEMPLATE", text: `${c.code} ${c.title} (${e.block.mode})`, dates, ctz: "Africa/Accra",
    location: where(e), details: `Lecturer: ${c.lecturer ?? "TBC"}${e.block.mode === "Virtual" ? `\nZoom: ${e.link ?? "posted each week on the portal Schedule page"}` : ""}`,
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

/** Current weekend if today falls inside it, otherwise the next upcoming one. */
export function currentOrNext(blocks: LectureBlock[], today = todayAccra()) {
  return blocks.find((b) => b.end_date >= today) ?? null;
}
export function previousLecture(blocks: LectureBlock[], b: LectureBlock) {
  const i = blocks.findIndex((x) => x.id === b.id);
  for (let j = i - 1; j >= 0; j--) if (blocks[j].mode !== "N/A") return blocks[j];
  return null;
}
