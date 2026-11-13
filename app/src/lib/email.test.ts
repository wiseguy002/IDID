import { describe, expect, it } from 'vitest';
import { sendEmail } from '../../../supabase/functions/_shared/email';

const env = (vars: Record<string, string>) => (n: string) => vars[n];

describe('server email helper (Resend)', () => {
  it('posts to Resend with the key from the environment and the configured sender', async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const fake = (async (url: string, init: RequestInit) => { seen = { url, init }; return new Response(JSON.stringify({ id: 'em_1' }), { status: 200 }); }) as unknown as typeof fetch;
    const r = await sendEmail({ to: 'a@example.com', subject: 'Hi', text: 'Hello' }, env({ RESEND_API_KEY: 're_test', EMAIL_FROM: 'iDID <idid@example.com>' }), fake);
    expect(r).toEqual({ ok: true, id: 'em_1' });
    expect(seen!.url).toBe('https://api.resend.com/emails');
    expect((seen!.init.headers as Record<string, string>).Authorization).toBe('Bearer re_test');
    expect(JSON.parse(seen!.init.body as string)).toEqual({ from: 'iDID <idid@example.com>', to: ['a@example.com'], subject: 'Hi', text: 'Hello' });
  });

  it('refuses to send without a key or sender, and reports Resend errors', async () => {
    const never = (async () => { throw new Error('should not be called'); }) as unknown as typeof fetch;
    expect(await sendEmail({ to: 'a@example.com', subject: 's', text: 't' }, env({ EMAIL_FROM: 'x <x@example.com>' }), never)).toMatchObject({ ok: false, error: 'RESEND_API_KEY is not set' });
    expect(await sendEmail({ to: 'a@example.com', subject: 's', text: 't' }, env({ RESEND_API_KEY: 'k' }), never)).toMatchObject({ ok: false, error: 'EMAIL_FROM is not set' });
    const bad = (async () => new Response(JSON.stringify({ message: 'API key is invalid' }), { status: 401 })) as unknown as typeof fetch;
    expect(await sendEmail({ to: 'a@example.com', subject: 's', text: 't' }, env({ RESEND_API_KEY: 'k', EMAIL_FROM: 'x <x@example.com>' }), bad)).toEqual({ ok: false, status: 401, error: 'API key is invalid' });
  });
});
