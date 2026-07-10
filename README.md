# Momentz
*A shared wedding memory album — by Crystal Clear Company*

Guests join with a name, bio, and photo. Everyone uploads photos/videos to a shared feed.
Posts can be public or private (visible only to people you pick). Likes and comments on every post.

This is a real, deployable web app (Next.js + Supabase). Nothing runs only in a chat window —
once deployed, it's a normal website with a normal link you send to guests.

## What you need (all free)
- A [Supabase](https://supabase.com) account — the database + photo/video storage
- A [Vercel](https://vercel.com) account — hosting, gives you the live link
- A [GitHub](https://github.com) account — to hand this code to Vercel
- Node.js installed on your computer, if you want to test it locally first (optional)

Total setup time: about 10–15 minutes, no coding required beyond copy/paste.

---

## Step 1 — Create your Supabase project
1. Go to supabase.com, sign up, and click **New project**.
2. Pick any name (e.g. "momentz") and a database password — save that password somewhere.
3. Wait ~2 minutes for the project to finish setting up.

## Step 2 — Set up the database
1. In your Supabase project, open **SQL Editor** (left sidebar) → **New query**.
2. Open `supabase/schema.sql` from this folder, copy all of it, paste it into the SQL editor, and click **Run**.
3. This creates all the tables (guests, posts, comments, likes, settings) and turns on realtime updates.

## Step 3 — Create the storage bucket (for photos/videos)
1. In Supabase, go to **Storage** (left sidebar) → **New bucket**.
2. Name it exactly: `media`
3. Toggle **Public bucket** to ON (so photos can display in the app). Click **Create bucket**.

## Step 4 — Get your API keys
1. In Supabase, go to **Settings** → **API**.
2. Copy the **Project URL** and the **anon public** key. You'll need both next.

## Step 5 — Configure the app
1. In this project folder, copy `.env.local.example` to a new file named `.env.local`.
2. Paste in your Project URL and anon key:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 6 (optional) — Test it on your own computer first
```
npm install
npm run dev
```
Then open http://localhost:3000. Try joining, uploading a photo, liking, commenting.

## Step 7 — Put the code on GitHub
1. Create a new (private is fine) repository on GitHub.
2. From this project folder:
   ```
   git init
   git add .
   git commit -m "Momentz launch"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/momentz.git
   git push -u origin main
   ```

## Step 8 — Deploy on Vercel
1. Go to vercel.com, sign up (use "Continue with GitHub" — easiest), click **Add New → Project**.
2. Pick the `momentz` repo you just pushed.
3. Before deploying, open **Environment Variables** and add the same two values from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**. In about a minute you'll get a real link like `momentz-yourname.vercel.app`.

**That link is what you send to guests.** Anyone who opens it can join and start posting — no
account, no app download, just the link.

---

## What works right away
- Join with name/bio/photo
- Upload photos and videos (stored for real, permanently, in Supabase Storage)
- Public posts (everyone sees them) and private posts (only people you pick)
- Likes and comments, live-updating for everyone viewing the album at the same time
- People tab showing who has/hasn't posted yet
- Reminders tab — shows who'd get nudged, and the on/off toggles are saved

## What's not wired up yet (Phase 2)
- **Actually sending the weekly reminder email/text.** The toggle and the "who's pending" list
  are real and saved — the sending itself needs a scheduled job. See
  `supabase/functions/weekly-reminders/index.ts` for a ready-to-deploy starting point using
  [Resend](https://resend.com) for email (free tier is plenty for a guest list). It also needs
  you to collect each guest's email at join time (a one-line addition to the join form and the
  `guests` table — noted in that file).
- **A custom domain** (e.g. momentz.love instead of a vercel.app address) — buy one from any
  registrar and connect it in Vercel's project settings under Domains, a few clicks.

## A note on privacy
Guests join by typing their name — there's no password or login. "Private" posts are hidden by
the app for anyone browsing normally, but someone who knows how to call the Supabase API directly
could technically still reach them, since guests aren't authenticated users. This is a reasonable
tradeoff for a wedding shared with people you trust. If you want database-level privacy guarantees
later (e.g. before turning this into a paid product for other couples), the next step is adding
Supabase Auth (magic-link or anonymous sign-in) and tightening the Row Level Security policies in
`supabase/schema.sql` to check the logged-in guest instead of allowing all requests.

## Project structure
```
app/
  page.js         — the whole app (join flow, feed, people, reminders, add-memory modal)
  layout.js        — page shell, fonts, metadata
  globals.css      — the visual design
lib/
  supabaseClient.js — connects the app to your Supabase project
supabase/
  schema.sql        — run this once in Supabase's SQL editor
  functions/weekly-reminders/ — Phase 2, optional
```
