# Content generation spec

This file is the instruction set for the **"Update the Learning Portal"** scheduled task (and for any "update the portal" request).
Generated content is **never committed**: bundles are written to `content/` (git-ignored), published to Supabase, and can then be deleted.

## Run order

1. `npx tsx scripts/publish-content.ts status` lists processed Drive files, existing topics and assignments, and pending dissertation requests.
2. List each course folder and its `Assignment` subfolder in Google Drive (root: *Learning Portal - MSc IT Semester 2*). Anything not in `processed_files`, or with a newer `modifiedTime`, is new work.
3. For each new file, read it and produce a bundle (format below). Write one bundle per course per run: `content/<course-slug>-<yyyymmdd>.json`.
4. `npx tsx scripts/publish-content.ts publish content/*.json`
5. Report what changed: new topics, updated topics, assignments, feedback, guides.

## Rules for each kind of file

**Lecture material (course folder, not `Assignment/`)**
- Split into topics. One lecture usually gives 1–3 topics. If the material extends an existing topic, **re-issue that topic with the same `id`** and a merged `content_md`, so the course book grows rather than duplicating. Keep `position` in lecture order.
- `id` format: `<course-slug>-t<NN>-<short-slug>`, e.g. `cics501-t03-normalisation`. Never change an id once published.
- `content_md` is the course book section. Write for an MSc student who missed the lecture:
  - Open with "Why this matters" (2–3 sentences, practical).
  - Explain every concept in plain English before any jargon, then give the formal term.
  - At least one ```mermaid diagram per topic (flowchart, ER diagram, sequence, state, or mind map).
  - **Relatable examples** set in Ghana/West Africa where natural: MoMo transactions, ECG prepaid meters, trotro routes, Melcom/Shoprite inventory, GRA tax records, hospital records at Korle Bu, a trading group with subsidiaries. Also one example from a well-known global company.
  - A worked example with step-by-step reasoning where the topic is procedural (SQL, normalisation, risk scoring, hashing, and so on).
  - Tables for comparisons.
  - A "Common mistakes" section and a "Summary" (5 bullets).
  - Use `> ` blockquotes for key definitions.
  - Stay faithful to the lecturer's material. Add clarifying context, but don't contradict the slides. Where the slides are thin, expand from standard textbooks for that subject.
- `audio_script`: a spoken overview of 350–600 words, conversational, in short paragraphs separated by blank lines. Cover every sub-part of the topic, and end with "three things to remember". No markdown and no symbols that don't read aloud.
- `key_terms`: 5–12 `{term, meaning}` pairs.
- `flashcards`: 8–15 per topic, one fact or idea per card.
- `questions`: 6–10 MCQs per topic, a mix of easy, medium and hard, 4 options, with plausible distractors. `explanation` says why the right answer is right **and** why the tempting wrong one is wrong. Stable ids: `<topic-id>-q<NN>`.
- `source_files`: the Drive files the topic came from.

**Assignment brief (`Assignment/` folder, not starting with `MY DRAFT`)**
- Create an `assignments` entry. `brief_md` summarises what was asked. `breakdown_md` contains:
  1. What each question is really asking (command words: discuss, evaluate, design…)
  2. The concepts and course topics each part draws on (put their ids in `related_topics`)
  3. A suggested structure with approximate word allocation
  4. What a strong answer shows, as a marking-criteria checklist
  5. A worked **parallel** example on a *different* scenario
  6. A list of sources to consult
- **Never write the answer to the actual assignment questions**, even in part.

**Student draft (`Assignment/` file named `MY DRAFT - …`)**
- Match it to its assignment and add `draft_feedback`:
  - Overall judgement
  - Strengths
  - Gaps against the criteria
  - Factual or technical errors
  - Structure and referencing
  - The 3 highest-impact improvements
  - Topics to revise
- Point to what to fix. Don't rewrite their text.

**Dissertation requests** (from `status`)
- Produce a `dissertation_guides` entry covering:
  - Refined title options
  - Problem statement pointers
  - Research questions and objectives
  - A chapter-by-chapter outline (Intro, Literature Review with key themes and seminal authors, Methodology options with pros and cons, Analysis, Discussion, Conclusion)
  - Data collection plan
  - Ethics
  - Tools
  - A 16-week timeline
  - Supervisor-meeting checklist
  - Common pitfalls
- Use the CIIS 691 folder materials if there are any. Guidance only: don't write chapters.

## Bundle format

```json
{
  "processed_files": [{ "id": "<drive file id>", "name": "Lecture 3.pdf", "modified_time": "2026-10-03T09:00:00Z" }],
  "topics": [{
    "id": "cics501-t03-normalisation", "course_code": "CICS 501", "position": 3,
    "title": "…", "summary": "one line", "content_md": "…", "audio_script": "…",
    "key_terms": [{ "term": "…", "meaning": "…" }],
    "source_files": [{ "id": "…", "name": "…" }],
    "flashcards": [{ "front": "…", "back": "…" }],
    "questions": [{ "id": "cics501-t03-normalisation-q01", "question": "…", "options": ["…","…","…","…"], "answer_index": 2, "explanation": "…", "difficulty": "medium" }]
  }],
  "assignments": [{ "id": "cics501-a01", "course_code": "CICS 501", "title": "…", "drive_file_id": "…", "due_date": "2026-11-01", "brief_md": "…", "breakdown_md": "…", "related_topics": ["cics501-t03-normalisation"] }],
  "draft_feedback": [{ "assignment_id": "cics501-a01", "drive_file_id": "…", "draft_name": "MY DRAFT - A1.docx", "feedback_md": "…" }],
  "dissertation_guides": [{ "id": 1, "guide_md": "…" }]
}
```

Course codes: `CICS 501`, `CIIS 534`, `CIIS 532`, `CIIS 6011`, `CICS 502`, `CIIS 691`.
Slugs: `cics501`, `ciis534`, `ciis532`, `ciis6011`, `cics502`, `ciis691`.
