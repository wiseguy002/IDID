// Transactional email through Resend (https://resend.com/docs/api-reference/emails/send-email).
//
// Reads RESEND_API_KEY and EMAIL_FROM from the environment (Supabase secrets in production,
// supabase/functions/.env locally). The key is never hard-coded or committed.
//
// Privacy rules for anything sent through here (see docs/SECURITY.md):
// - Never include journal content, names of parts, or anything a circle has written.
// - Never include invite links or care-share links: they carry decryption keys in the
//   URL fragment, and email passes through third-party servers. Those links are shared
//   from the person's own device instead.
//
// Sign-in codes are sent by Supabase Auth itself, using Resend over SMTP (docs/SETUP.md).

export interface Email { to: string | string[]; subject: string; text: string; html?: string; replyTo?: string }
export type EmailResult = { ok: true; id: string } | { ok: false; status: number; error: string };

type Env = (name: string) => string | undefined;
// Works in Supabase Edge Functions (Deno) and in Node scripts.
const defaultEnv: Env = (name) =>
  (globalThis as { Deno?: { env: { get(n: string): string | undefined } } }).Deno?.env.get(name)
  ?? (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env[name];

export async function sendEmail(email: Email, env: Env = defaultEnv, fetcher: typeof fetch = fetch): Promise<EmailResult> {
  const key = env('RESEND_API_KEY');
  const from = env('EMAIL_FROM');
  if (!key) return { ok: false, status: 0, error: 'RESEND_API_KEY is not set' };
  if (!from) return { ok: false, status: 0, error: 'EMAIL_FROM is not set' };
  const res = await fetcher('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from, to: Array.isArray(email.to) ? email.to : [email.to], subject: email.subject, text: email.text,
      ...(email.html ? { html: email.html } : {}), ...(email.replyTo ? { reply_to: email.replyTo } : {}),
    }),
  });
  const body = await res.json().catch(() => ({})) as { id?: string; message?: string };
  return res.ok && body.id ? { ok: true, id: body.id } : { ok: false, status: res.status, error: body.message ?? res.statusText };
}
