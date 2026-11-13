import { useEffect, useRef, useState } from 'react';
import { TURNSTILE_SITE_KEY, captchaEnabled, loadTurnstile } from '../lib/captcha';

/**
 * A quiet "are you a person?" check before we email a sign-in code. Most people never see it: it only
 * asks for a tap when Cloudflare isn't sure. Each token works once, so bump `resetKey` after every send.
 */
export default function Captcha({ onToken, resetKey = 0 }: { onToken: (token: string) => void; resetKey?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    if (!captchaEnabled() || !box.current) return;
    let gone = false;
    loadTurnstile().then((t) => {
      if (gone || !box.current) return;
      if (id.current) { t.reset(id.current); return; }
      id.current = t.render(box.current, {
        sitekey: TURNSTILE_SITE_KEY,
        appearance: 'interaction-only',
        action: 'sign-in',
        callback: (token: string) => { setProblem(''); onToken(token); },
        'expired-callback': () => onToken(''),
        'error-callback': () => { onToken(''); setProblem("The sign-in check didn't finish. Wait a moment and it will try again."); },
      });
    }).catch((e: Error) => setProblem(e.message));
    return () => { gone = true; };
  }, [resetKey, onToken]);

  useEffect(() => () => { if (id.current) window.turnstile?.remove(id.current); }, []);

  if (!captchaEnabled()) return null;
  return <>
    <div ref={box} className="captcha" />
    {problem && <p className="small muted" role="status">{problem}</p>}
  </>;
}
