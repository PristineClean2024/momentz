// PHASE 2 — not required to launch Momentz, only needed once you want the
// weekly reminder toggle in the Reminders tab to actually send emails.
//
// This is a Supabase Edge Function. To use it:
//   1. Install the Supabase CLI (npm install -g supabase)
//   2. supabase functions deploy weekly-reminders
//   3. Set a secret:  supabase secrets set RESEND_API_KEY=your_resend_key
//      (Resend: https://resend.com — free tier is plenty for a wedding guest list)
//   4. Schedule it to run weekly: in the Supabase dashboard, go to
//      Database > Cron Jobs, and add a job that calls this function's URL
//      once a week (e.g. every Monday 9am).
//
// This function finds every guest who has NOT posted yet and, if the
// "reminders_email" setting is on, emails each of them a link back to the app.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const APP_URL = Deno.env.get('APP_URL') || 'https://your-momentz-app.vercel.app';

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();
  if (!settings?.reminders_email) {
    return new Response(JSON.stringify({ skipped: true, reason: 'reminders disabled' }));
  }

  const { data: guests } = await supabase.from('guests').select('id, name, email');
  const { data: posts } = await supabase.from('posts').select('author_id');
  const postedIds = new Set((posts || []).map((p) => p.author_id));
  const pending = (guests || []).filter((g) => !postedIds.has(g.id) && g.email);

  const results = [];
  for (const guest of pending) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Momentz <memories@yourdomain.com>',
        to: guest.email,
        subject: "A few photos are missing you 💛",
        html: `<p>Hi ${guest.name} — a few memories from the wedding are missing you!</p>
               <p><a href="${APP_URL}">Tap here to add yours</a> — it only takes a minute.</p>`,
      }),
    });
    results.push({ guest: guest.name, ok: res.ok });
  }

  return new Response(JSON.stringify({ sent: results.length, results }));
});

// NOTE: the current "guests" table doesn't collect an email address at
// join time. To use this function, add an email field to the join form
// (app/page.js JoinScreen) and an `email` column to the guests table:
//   alter table guests add column email text;
