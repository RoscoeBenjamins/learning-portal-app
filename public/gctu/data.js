/* =========================================================
   GCTU SGSR Student Portal — ALL editable data lives here.
   Anything marked "[CONFIRM]" is unknown: replace it with the
   real value. Leave a value as null if it is still unknown.
   Time zone for everything: Africa/Accra (UTC+0, no DST).
   ========================================================= */
window.PORTAL = {
  academicYear: "2026/2027",
  semester: "September 2026 – January 2027",
  timezone: "Africa/Accra",

  /* Link to the original delivery-mode PDF. [CONFIRM] */
  deliveryPdfUrl: null,

  faculties: [
    { id: "business",     name: "Business School (Masters & PhD)" },
    { id: "focisMasters", name: "FoCIS Masters" },
    { id: "focisPhd",     name: "FoCIS PhD" }
  ],
  defaultFaculty: "focisMasters",

  /* Lecture times per faculty and day, 24h "HH:MM". [CONFIRM]
     While null, calendar events are saved as all-day events. */
  lectureTimes: {
    business:     { fri: { start: null, end: null }, sat: { start: null, end: null }, sun: { start: null, end: null } },
    focisMasters: { fri: { start: null, end: null }, sat: { start: null, end: null }, sun: { start: null, end: null } },
    focisPhd:     { fri: { start: null, end: null }, sat: { start: null, end: null }, sun: { start: null, end: null } }
  },

  /* Weekly class timetable per faculty (repeats every lecture weekend).
     Source: "MSC 2ND SEMESTER TIME TABLE", Dept. of Information Technology (xlsx).
     start/end null = not given in the timetable. timeAsGiven keeps the original wording. */
  timetable: {
    focisMasters: [
      { day: "sat", start: "07:00", end: "10:00", timeAsGiven: "7:00 AM - 10:00AM", code: "CICS 501",  title: "Database Management Systems",      lecturer: "Dr. Fred Amankwah-Sarfo",   venue: null },
      { day: "sat", start: "12:30", end: "14:00", timeAsGiven: "12:30PM - 2PM (confirmed: lecturer's available time)", code: "CIIS 534", title: "IT Governance", lecturer: "Prof. Stephen Asunka", venue: null },
      { day: "sat", start: "15:00", end: "18:00", timeAsGiven: "3PM - 6PM",         code: "CIIS 532",  title: "IT Project and Change Management", lecturer: "Prof. George Amoako",       venue: null },
      { day: "sun", start: "11:00", end: "14:00", timeAsGiven: "11:00AM - 2:00PM",  code: "CIIS 6011", title: "Big Data Mining and Analytics",    lecturer: "Dr. Emmanuel Eli-Fianu",    venue: null },
      { day: "sun", start: "15:00", end: "18:00", timeAsGiven: "3:00PM - 6:00PM",   code: "CICS 502",  title: "Network and Information Security", lecturer: "Dr. Israel Edem Agbehadji", venue: "C10" },
      { day: "sun", start: "15:00", end: "18:00", timeAsGiven: "3PM - 6PM (confirmed by student)", code: "CIIS 691",  title: "Masters Thesis/Project",           lecturer: "All supervisors",           venue: null }
    ]
    /* No Friday classes appear in this timetable. [CONFIRM] */
  },

  /* Venue / meeting link per faculty and mode. [CONFIRM] */
  locations: {
    business:     { "Virtual": null, "Face-to-Face": null },
    focisMasters: { "Virtual": null, "Face-to-Face": null },
    focisPhd:     { "Virtual": null, "Face-to-Face": null }
  },

  /* Weekend lecture blocks (Friday–Sunday), from the official table. */
  blocks: [
    { id: "b01", start: "2026-10-02", end: "2026-10-04", modes: { business: "Virtual",      focisMasters: "N/A",          focisPhd: "N/A" } },
    { id: "b02", start: "2026-10-09", end: "2026-10-11", modes: { business: "Face-to-Face", focisMasters: "Virtual",      focisPhd: "Virtual" } },
    { id: "b03", start: "2026-10-16", end: "2026-10-18", modes: { business: "Virtual",      focisMasters: "Virtual",      focisPhd: "Face-to-Face" } },
    { id: "b04", start: "2026-10-23", end: "2026-10-25", modes: { business: "Virtual",      focisMasters: "Face-to-Face", focisPhd: "Virtual" } },
    { id: "b05", start: "2026-10-30", end: "2026-11-01", modes: { business: "Face-to-Face", focisMasters: "Virtual",      focisPhd: "Virtual" } },
    { id: "b06", start: "2026-11-06", end: "2026-11-08", modes: { business: "Virtual",      focisMasters: "Face-to-Face", focisPhd: "Virtual" } },
    { id: "b07", start: "2026-11-13", end: "2026-11-15", modes: { business: "Virtual",      focisMasters: "Virtual",      focisPhd: "Face-to-Face" } },
    { id: "b08", start: "2026-11-20", end: "2026-11-22", modes: { business: "Face-to-Face", focisMasters: "Virtual",      focisPhd: "Virtual" } },
    { id: "b09", start: "2026-11-27", end: "2026-11-29", modes: { business: "Face-to-Face", focisMasters: "Virtual",      focisPhd: "Virtual" } },
    { id: "b10", start: "2026-12-04", end: "2026-12-06", modes: { business: "Virtual",      focisMasters: "Face-to-Face", focisPhd: "Virtual" } },
    { id: "b11", start: "2026-12-11", end: "2026-12-13", modes: { business: "Face-to-Face", focisMasters: "Virtual",      focisPhd: "Face-to-Face" } },
    { id: "b12", start: "2026-12-18", end: "2026-12-20", modes: { business: "Virtual",      focisMasters: "Virtual",      focisPhd: "Virtual" } }
  ],

  /* Non-lecture periods. End of break is "early January" — [CONFIRM] exact date. */
  breaks: [
    { label: "Christmas break", start: "2026-12-21", end: null, note: "Ends early January 2027 [CONFIRM date]" },
    { label: "Examinations",    start: "2027-01-01", end: "2027-01-31", note: "Exam timetable to be announced [CONFIRM]" }
  ],

  notes: [
    "Faculty of Engineering programmes are 100% in person, Monday–Friday, evenings only.",
    "Further changes will be announced as and when."
  ],

  /* Per-block session details for the selected faculty, keyed by block id then day.
     Example: sessions: { focisMasters: { b04: { sat: { course: "CICS 501", topic: "…" } } } }
     All values [CONFIRM]. */
  sessions: { business: {}, focisMasters: {}, focisPhd: {} },

  /* Courses + outlines. Filled only from uploaded course outlines — never invented.
     Shape: { code, title, faculty, lecturer, weeks: [{ week, blockId, topics: [], readings: [], assessments: [] }] } */
  courses: [],

  /* Assignments. Filled only from uploaded briefs.
     Shape: { code, slug, title, course, faculty, due: "YYYY-MM-DDTHH:MM", status, page } */
  assignments: []
};
