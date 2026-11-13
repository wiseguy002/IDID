// Sends one test email through the same helper the server uses.
// Usage (from the repo root, with RESEND_API_KEY and EMAIL_FROM in the environment):
//   node --experimental-strip-types scripts/send-test-email.mts you@example.com
import { sendEmail } from '../supabase/functions/_shared/email.ts';

const to = process.argv[2];
if (!to) { console.error('Usage: send-test-email.mts <to-address>'); process.exit(1); }
const r = await sendEmail({
  to,
  subject: 'iDID test email',
  text: 'This is a test from iDID’s email setup. If you can read this, email through Resend is working.\n\nNo action is needed.',
  html: '<p>This is a test from iDID’s email setup. If you can read this, email through Resend is working.</p><p>No action is needed.</p>',
});
console.log(r.ok ? `Sent. Resend email id: ${r.id}` : `Not sent (${r.status}): ${r.error}`);
process.exit(r.ok ? 0 : 1);
