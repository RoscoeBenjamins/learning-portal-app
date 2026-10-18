/* Shared header, navigation, faculty selector, theme and date helpers. */
(function () {
  var D = window.PORTAL;
  var KEY_FAC = "gctu.faculty", KEY_THEME = "gctu.theme";

  function store(key, val) {
    try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; }
    return null;
  }

  /* ---- Dates (Africa/Accra is UTC+0 all year, so UTC == local) ---- */
  function parseDate(s) { var p = s.split("-"); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function todayAccra() { var n = new Date(); return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())); }
  function addDays(d, n) { return new Date(d.getTime() + n * 864e5); }
  var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  function fmt(d, opts) {
    opts = opts || {};
    var s = (opts.weekday ? DAYS[d.getUTCDay()] + " " : "") + d.getUTCDate() + " " + MONTHS[d.getUTCMonth()];
    return opts.year ? s + " " + d.getUTCFullYear() : s;
  }
  function fmtRange(a, b) {
    var A = parseDate(a), B = parseDate(b);
    if (A.getUTCMonth() === B.getUTCMonth()) return A.getUTCDate() + "–" + B.getUTCDate() + " " + MONTHS[A.getUTCMonth()] + " " + A.getUTCFullYear();
    return fmt(A) + " – " + fmt(B, { year: true });
  }

  /* ---- Faculty ---- */
  function facultyList() { return D.faculties; }
  function getFaculty() {
    var v = store(KEY_FAC);
    return D.faculties.some(function (f) { return f.id === v; }) ? v : D.defaultFaculty;
  }
  function facultyName(id) { var f = D.faculties.filter(function (x) { return x.id === id; })[0]; return f ? f.name : id; }
  function setFaculty(id) {
    store(KEY_FAC, id);
    document.querySelectorAll(".js-faculty").forEach(function (s) { s.value = id; });
    document.dispatchEvent(new CustomEvent("facultychange", { detail: id }));
  }

  /* ---- Mode badge ---- */
  function modeClass(m) { return m === "Virtual" ? "virtual" : m === "Face-to-Face" ? "f2f" : "na"; }
  function badge(mode) { return '<span class="badge ' + modeClass(mode) + '">' + (mode === "N/A" ? "N/A" : mode) + "</span>"; }
  function confirmTag(label) { return '<span class="confirm">' + (label || "[CONFIRM]") + "</span>"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---- Block status ---- */
  function blockStatus(b, today) {
    today = today || todayAccra();
    var s = parseDate(b.start), e = parseDate(b.end);
    if (today < s) return "upcoming";
    if (today > e) return "past";
    return "current";
  }
  /* Current block, or the next one; optionally only blocks where the faculty has lectures. */
  function currentOrNext(facId) {
    var today = todayAccra();
    var list = D.blocks.filter(function (b) { return !facId || b.modes[facId] !== "N/A"; });
    for (var i = 0; i < list.length; i++) if (parseDate(list[i].end) >= today) return list[i];
    return null;
  }
  function currentBreak() {
    var today = todayAccra();
    return D.breaks.filter(function (br) {
      var s = parseDate(br.start), e = br.end ? parseDate(br.end) : null;
      return today >= s && (!e || today <= e);
    })[0] || null;
  }

  /* ---- Header ---- */
  var PAGES = [
    { href: "index.html", label: "Home" },
    { href: "delivery.html", label: "Delivery mode" },
    { href: "schedule.html", label: "Schedule" },
    { href: "coursebook.html", label: "Course book" },
    { href: "assignments.html", label: "Assignments" }
  ];

  function applyTheme(t) {
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
  }
  applyTheme(store(KEY_THEME));

  function isDark() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function buildHeader() {
    var here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    if (here.indexOf("assignment-") === 0) here = "assignments.html";
    var fac = getFaculty();
    var opts = D.faculties.map(function (f) { return '<option value="' + f.id + '"' + (f.id === fac ? " selected" : "") + ">" + esc(f.name) + "</option>"; }).join("");
    var links = PAGES.map(function (p) {
      return '<li><a href="' + p.href + '"' + (p.href === here ? ' aria-current="page"' : "") + ">" + p.label + "</a></li>";
    }).join("");
    var header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML =
      '<a class="skip" href="#main">Skip to content</a>' +
      '<div class="bar">' +
        '<a class="brand" href="index.html">GCTU <span>SGSR</span> Portal</a>' +
        '<button class="icon-btn" id="nav-toggle" aria-expanded="false" aria-controls="site-nav">☰ <span>Menu</span></button>' +
        '<nav class="site-nav" id="site-nav" aria-label="Main"><ul>' + links + "</ul></nav>" +
        '<div class="bar-tools">' +
          '<div class="faculty-picker"><label for="faculty-select">Faculty</label>' +
          '<select id="faculty-select" class="js-faculty">' + opts + "</select></div>" +
          '<button class="icon-btn" id="theme-toggle" aria-label="Switch colour theme"></button>' +
        "</div>" +
      "</div>";
    document.body.insertBefore(header, document.body.firstChild);

    var toggle = header.querySelector("#nav-toggle"), nav = header.querySelector("#site-nav");
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    header.querySelector("#faculty-select").addEventListener("change", function (e) { setFaculty(e.target.value); });

    var tb = header.querySelector("#theme-toggle");
    function paintTheme() { tb.textContent = isDark() ? "☀ Light" : "☾ Dark"; }
    tb.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      applyTheme(next); store(KEY_THEME, next); paintTheme();
    });
    paintTheme();

    var footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = "GCTU School of Graduate Studies &amp; Research · " + esc(D.academicYear) + " · All times Africa/Accra (GMT, UTC+0).";
    document.body.appendChild(footer);
  }

  window.Portal = {
    data: D, store: store, esc: esc,
    parseDate: parseDate, todayAccra: todayAccra, addDays: addDays, fmt: fmt, fmtRange: fmtRange,
    facultyList: facultyList, getFaculty: getFaculty, setFaculty: setFaculty, facultyName: facultyName,
    badge: badge, modeClass: modeClass, confirmTag: confirmTag,
    blockStatus: blockStatus, currentOrNext: currentOrNext, currentBreak: currentBreak
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildHeader);
  else buildHeader();
})();
