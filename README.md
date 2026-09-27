# Learning Portal

A study portal for the MSc-MPhil IT semester 2 courses. It has:

- **Course books:** plain-language explanations, diagrams, and relatable examples.
- **Topic checks:** flashcards and a quiz after every topic, with an understanding rating.
- **Tests:** mixed or per-topic. Wrong answers are explained and linked back to the topic.
- **Assignments:** guided breakdowns, plus feedback on your own drafts.
- **Audio overviews:** one per topic, read aloud by the browser.
- **Performance:** progress, strengths and weak areas for each course.
- **Dissertation / project guides** for CIIS 691.

Every account needs a password **and** an authenticator app (Google Authenticator or Microsoft Authenticator).

## How it fits together

```
Google Drive (lecture slides, assignments)
      │  read by a Cowork scheduled task (Claude, on your Claude plan, no API key)
      ▼
scripts/publish-content.ts ──► Supabase (Postgres + Auth with TOTP 2FA)
                                   ▲
      Vercel (this repo, Next.js) ─┘  reads content, saves quiz results
```

- The web app never calls an AI API. Content is generated in Cowork and published to Supabase.
- Generated content is **not** stored in this public repo (`content/` is git-ignored), so lecture-derived material stays behind the login.

## Setup

1. **Supabase** (free): create a project.
   - SQL Editor → run `supabase/migrations/0001_init.sql`.
   - Authentication → Sign In / Providers → Email: on.
   - Authentication → Multi-Factor → TOTP: enabled.
   - Authentication → URL Configuration: Site URL = your Vercel URL. Add `https://<your-app>.vercel.app/auth/callback` to Redirect URLs.
2. **Vercel** (free): import this repo. Set the environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then deploy.
3. **Content publishing**: put `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`, wherever the publish script runs. Never commit the service-role key and never add it to Vercel.

## Updating content

See [`content/README.md`](content/README.md) for the generation rules and bundle format.

```bash
npx tsx scripts/publish-content.ts status
npx tsx scripts/publish-content.ts publish content/cics501-20261003.json
```

## Security notes

- **Row-level security:** course content can only be read by signed-in users whose session has passed 2FA (`aal2`). Quiz scores, flashcard progress and dissertation requests are private to each user. Nobody can write content through the API.
- **Lost phone:** add a second authenticator under Settings. If every authenticator is lost, an admin removes the factor in Supabase → Authentication → Users, and the user enrols again at next sign-in.

## Local development

```bash
cp .env.example .env.local   # fill in values
npm install
npm run dev
```
