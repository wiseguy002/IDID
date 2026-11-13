/**
 * Cloudflare Turnstile for the "email me a code" step. It stops bots from using the sign-in form to send
 * email, which protects the shared daily email allowance. Turnstile only sees that someone is using the
 * sign-in page, never anything from the journal. Without VITE_TURNSTILE_SITE_KEY (local development) it is off.
 */
export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || '';
export const captchaEnabled = () => !!TURNSTILE_SITE_KEY;

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

type Turnstile = {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id: string): void;
  remove(id: string): void;
};
declare global { interface Window { turnstile?: Turnstile } }

let loading: Promise<Turnstile> | null = null;
export function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT; s.async = true;
      s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile did not load')));
      s.onerror = () => { loading = null; reject(new Error("The sign-in check couldn't load. Check your connection and try again.")); };
      document.head.appendChild(s);
    });
  }
  return loading;
}
