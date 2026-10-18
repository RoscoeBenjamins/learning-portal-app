/* iCalendar (.ics) + Google Calendar helpers. RFC 5545, time zone Africa/Accra. */
(function () {
  var P = window.Portal, D = window.PORTAL;
  var TZ = "Africa/Accra";
  var DAY_KEYS = ["fri", "sat", "sun"], DAY_NAMES = { fri: "Friday", sat: "Saturday", sun: "Sunday" };

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(dateStr) { return dateStr.replace(/-/g, ""); }
  function dateStrFrom(d) { return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()); }
  function stamp() { var n = new Date(); return n.getUTCFullYear() + pad(n.getUTCMonth() + 1) + pad(n.getUTCDate()) + "T" + pad(n.getUTCHours()) + pad(n.getUTCMinutes()) + pad(n.getUTCSeconds()) + "Z"; }
  function hm(t) { return t.replace(":", "") + "00"; }
  function escText(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }

  /* Fold lines at 75 octets (UTF-8 aware), CRLF line endings. */
  function fold(line) {
    var out = [], cur = "", bytes = 0, limit = 75;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i], cp = line.codePointAt(i);
      if (cp > 0xffff) { ch = line.slice(i, i + 2); i++; }
      var b = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
      if (bytes + b > limit) { out.push(cur); cur = " "; bytes = 1; limit = 75; }
      cur += ch; bytes += b;
    }
    out.push(cur);
    return out.join("\r\n");
  }

  var VTIMEZONE = [
    "BEGIN:VTIMEZONE", "TZID:" + TZ, "X-LIC-LOCATION:" + TZ,
    "BEGIN:STANDARD", "DTSTART:19700101T000000", "TZOFFSETFROM:+0000", "TZOFFSETTO:+0000", "TZNAME:GMT", "END:STANDARD",
    "END:VTIMEZONE"
  ];

  /* event: { uid, title, description, location, date:"YYYY-MM-DD", start:"HH:MM"|null, end:"HH:MM"|null,
              alarms:[{ trigger:"-P2D", text:"…" }] } — no start time ⇒ all-day event. */
  function vevent(ev) {
    var L = ["BEGIN:VEVENT", "UID:" + ev.uid, "DTSTAMP:" + stamp(), "SUMMARY:" + escText(ev.title)];
    if (ev.start) {
      L.push("DTSTART;TZID=" + TZ + ":" + ymd(ev.date) + "T" + hm(ev.start));
      L.push("DTEND;TZID=" + TZ + ":" + ymd(ev.date) + "T" + hm(ev.end || ev.start));
    } else {
      var next = dateStrFrom(P.addDays(P.parseDate(ev.date), 1));
      L.push("DTSTART;VALUE=DATE:" + ymd(ev.date), "DTEND;VALUE=DATE:" + ymd(next), "TRANSP:TRANSPARENT");
    }
    if (ev.description) L.push("DESCRIPTION:" + escText(ev.description));
    if (ev.location) L.push("LOCATION:" + escText(ev.location));
    (ev.alarms || []).forEach(function (a) {
      L.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + escText(a.text || ev.title), "TRIGGER:" + a.trigger, "END:VALARM");
    });
    L.push("END:VEVENT");
    return L;
  }

  function calendar(events, name) {
    var L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//GCTU SGSR Student Portal//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
    if (name) L.push("X-WR-CALNAME:" + escText(name));
    L.push("X-WR-TIMEZONE:" + TZ);
    L = L.concat(VTIMEZONE);
    events.forEach(function (ev) { L = L.concat(vevent(ev)); });
    L.push("END:VCALENDAR");
    return L.map(fold).join("\r\n") + "\r\n";
  }

  function download(filename, text) {
    var blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* ---------- Lecture blocks ---------- */
  function lectureAlarms(timed, title) {
    var a = [
      { trigger: "-P2D", text: "In 2 days: " + title },
      { trigger: "-P1D", text: "Tomorrow: " + title }
    ];
    /* 1 hour before needs a start time; for all-day events remind at 07:00 on the day instead. */
    a.push(timed ? { trigger: "-PT1H", text: "In 1 hour: " + title } : { trigger: "PT7H", text: "Today: " + title });
    return a;
  }

  function session(facId, blockId, day) {
    var s = (D.sessions[facId] || {})[blockId] || {};
    return s[day] || {};
  }

  var DAY_OFFSET = { fri: 0, sat: 1, sun: 2 };
  function slotLocation(slot, facId, mode) {
    var modeLoc = (D.locations[facId] || {})[mode] || "";
    return mode === "Face-to-Face" ? (slot.venue || modeLoc) : modeLoc;
  }

  /* One event per timetabled class when the faculty has a timetable in data.js. */
  function timetableEvents(block, facId, mode) {
    var start = P.parseDate(block.start);
    return (D.timetable[facId] || []).map(function (s, i) {
      var title = s.code + " " + s.title + " (" + mode + ")";
      var loc = slotLocation(s, facId, mode);
      var desc = [P.facultyName(facId) + " – " + mode + " lecture.", "Lecturer: " + (s.lecturer || "to be confirmed")];
      var topic = (((D.sessions[facId] || {})[block.id] || {})[s.code] || {}).topic;
      if (topic) desc.push("Topic: " + topic);
      if (!s.start) desc.push("Time not confirmed" + (s.timeAsGiven ? " (timetable says: " + s.timeAsGiven + ")" : "") + ".");
      if (!loc) desc.push((mode === "Face-to-Face" ? "Venue" : "Meeting link") + " not yet confirmed.");
      return {
        uid: block.id + "-" + s.day + "-" + s.code.replace(/\s+/g, "") + "-" + facId + "@gctu-sgsr-portal",
        title: title, description: desc.join("\n"), location: loc,
        date: dateStrFrom(P.addDays(start, DAY_OFFSET[s.day])), start: s.start, end: s.end,
        alarms: lectureAlarms(!!s.start, title)
      };
    });
  }

  function blockEvents(block, facId) {
    var mode = block.modes[facId];
    if (!mode || mode === "N/A") return [];
    if ((D.timetable || {})[facId] && D.timetable[facId].length) return timetableEvents(block, facId, mode);
    var times = (D.lectureTimes[facId] || {});
    var loc = (D.locations[facId] || {})[mode] || "";
    var start = P.parseDate(block.start);
    return DAY_KEYS.map(function (k, i) {
      var t = times[k] || {}, s = session(facId, block.id, k);
      var title = "Lectures (" + mode + ")" + (s.course ? " – " + s.course : "");
      var desc = [P.facultyName(facId) + " – " + DAY_NAMES[k] + " lectures, " + mode + "."];
      if (s.topic) desc.push("Topic: " + s.topic);
      if (!t.start) desc.push("Lecture time not yet confirmed.");
      if (!loc) desc.push("Venue / meeting link not yet confirmed.");
      return {
        uid: block.id + "-" + k + "-" + facId + "@gctu-sgsr-portal",
        title: title, description: desc.join("\n"), location: s.location || loc,
        date: dateStrFrom(P.addDays(start, i)), start: t.start || null, end: t.end || null,
        alarms: lectureAlarms(!!t.start, title)
      };
    });
  }

  function blockIcs(block, facId) {
    return calendar(blockEvents(block, facId), "GCTU lectures " + P.fmtRange(block.start, block.end));
  }
  function fullIcs(facId) {
    var evs = [];
    D.blocks.forEach(function (b) { evs = evs.concat(blockEvents(b, facId)); });
    return calendar(evs, "GCTU " + P.facultyName(facId) + " lectures " + D.academicYear);
  }

  /* Google Calendar: one all-day entry spanning Fri–Sun (Google links can't carry 3 events or reminders). */
  function googleBlockLink(block, facId) {
    var mode = block.modes[facId];
    var endExcl = dateStrFrom(P.addDays(P.parseDate(block.end), 1));
    var times = D.lectureTimes[facId] || {};
    var tt = (D.timetable || {})[facId] || [];
    var lines = tt.length
      ? tt.map(function (s) { return DAY_NAMES[s.day] + " " + (s.start ? s.start + "–" + s.end : "time TBC") + ": " + s.code + " " + s.title + (mode === "Face-to-Face" && s.venue ? " (" + s.venue + ")" : ""); })
      : DAY_KEYS.map(function (k) {
          var t = times[k] || {};
          return DAY_NAMES[k] + ": " + (t.start ? t.start + "–" + (t.end || "?") : "time to be confirmed");
        });
    var q = {
      action: "TEMPLATE",
      text: "Lectures (" + mode + ")",
      dates: ymd(block.start) + "/" + ymd(endExcl),
      ctz: TZ,
      details: P.facultyName(facId) + " weekend lectures (" + mode + ").\n" + lines.join("\n"),
      location: (D.locations[facId] || {})[mode] || ""
    };
    return "https://calendar.google.com/calendar/render?" + Object.keys(q).filter(function (k) { return q[k]; })
      .map(function (k) { return k + "=" + encodeURIComponent(q[k]); }).join("&");
  }

  /* ---------- Assignments (reminders 7, 2, 1 days before) ---------- */
  function assignmentEvent(a) {
    var parts = a.due.split("T"), time = parts[1] || null;
    var title = "Due: " + a.title + (a.course ? " (" + a.course + ")" : "");
    return {
      uid: "assign-" + a.slug + "@gctu-sgsr-portal", title: title,
      description: "Assignment due" + (time ? " at " + time + " (Africa/Accra)." : "."),
      date: parts[0], start: time, end: time,
      alarms: [{ trigger: "-P7D", text: "1 week left: " + title }, { trigger: "-P2D", text: "2 days left: " + title }, { trigger: "-P1D", text: "Due tomorrow: " + title }]
    };
  }
  function assignmentIcs(a) { return calendar([assignmentEvent(a)], a.title); }
  function googleAssignmentLink(a) {
    var parts = a.due.split("T"), d = ymd(parts[0]);
    var dates = parts[1] ? d + "T" + hm(parts[1]) + "/" + d + "T" + hm(parts[1]) : d + "/" + ymd(dateStrFrom(P.addDays(P.parseDate(parts[0]), 1)));
    return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent("Due: " + a.title) +
      "&dates=" + dates + "&ctz=" + encodeURIComponent(TZ) + "&details=" + encodeURIComponent(a.course || "");
  }

  window.ICS = {
    calendar: calendar, download: download,
    blockEvents: blockEvents, blockIcs: blockIcs, fullIcs: fullIcs, googleBlockLink: googleBlockLink,
    assignmentIcs: assignmentIcs, googleAssignmentLink: googleAssignmentLink
  };
})();
