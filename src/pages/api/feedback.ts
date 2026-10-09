// Anonymous feedback. Emails only the note text: no IP, no headers. The IP is
// used in memory for rate limiting and never written. Sent the moment it
// arrives, so the email's own timestamp is the one thing that isn't hidden.
import type { APIRoute } from 'astro';
import { FEEDBACK_EMAIL_TO, RESEND_API_KEY } from 'astro:env/server';

export const prerender = false;

const MAX_LENGTH = 600; // matches the textarea's maxlength
const MAX_BODY = 10_000;
const LIMIT = 5; // notes per IP per window
const WINDOW_MS = 60 * 60 * 1000;
const MAX_TRACKED = 5000;

// Per function instance. Instances are recycled, so this is a speed bump
// against a flood, not a hard guarantee.
const hits = new Map<string, number[]>();

function isLimited(ip: string, now = Date.now()): boolean {
  if (hits.size > MAX_TRACKED) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  const limited = recent.length >= LIMIT;
  if (!limited) recent.push(now);
  hits.set(ip, recent);
  return limited;
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY) {
    return json(413, { error: 'too_large' });
  }

  let ip = 'unknown';
  try {
    ip = clientAddress;
  } catch {
    // Not available in every runtime; everyone without one shares a bucket.
  }
  if (isLimited(ip)) return json(429, { error: 'rate_limited' });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json(413, { error: 'too_large' });

  let note: unknown;
  try {
    note = JSON.parse(raw)?.note;
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  const text = typeof note === 'string' ? note.trim() : '';
  if (!text || text.length > MAX_LENGTH) return json(400, { error: 'invalid_note' });

  if (!RESEND_API_KEY || !FEEDBACK_EMAIL_TO) {
    if (import.meta.env.DEV) {
      console.info('[feedback] email not configured; note was:\n' + text);
      return json(200, { ok: true });
    }
    return json(503, { error: 'not_configured' });
  }

  try {
    // Resend's shared test sender needs no domain setup, but it only delivers
    // to the address that owns the Resend account. That address is private,
    // so it lives in an env var rather than in this public repo.
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: 'Site feedback <onboarding@resend.dev>',
        to: FEEDBACK_EMAIL_TO,
        subject: 'Anonymous feedback',
        text,
      }),
    });
    if (!res.ok) throw new Error(`Resend responded ${res.status}: ${await res.text()}`);
  } catch (err) {
    console.error('[feedback] could not send note', err);
    return json(502, { error: 'send_failed' });
  }

  return json(200, { ok: true });
};

export const ALL: APIRoute = () => json(405, { error: 'method_not_allowed' });
