import { useEffect, useRef } from 'react';

export type CalmMode = 'ripples' | 'trails' | 'drift';

interface Ripple { x: number; y: number; t0: number }
interface Spark { x: number; y: number; t0: number; r: number }
interface Orb { x: number; y: number; r: number; vx: number; vy: number; phase: number; hue: 0 | 1 | 2 }

/** Reads the theme's colors so the canvas always matches light, dark or high contrast. */
function palette() {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string, f: string) => s.getPropertyValue(n).trim() || f;
  return { bg: v('--bg', '#f5efe6'), a: v('--accent', '#6d8d7d'), b: v('--accent-2', '#8796b3'), c: v('--warm', '#b4875e') };
}

function rgba(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, alpha))})`;
}

/**
 * A quiet, wordless canvas. Nothing to win or lose. Everything moves slowly, nothing flashes,
 * and with calm motion on, shapes fade in place instead of moving.
 */
export function CalmCanvas({ mode, calmMotion, onTouch }: { mode: CalmMode; calmMotion: boolean; onTouch?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef({ ripples: [] as Ripple[], sparks: [] as Spark[], orbs: [] as Orb[], lastAuto: 0, down: false, w: 0, h: 0 });

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext('2d')!;
    const st = state.current;
    let colors = palette();
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = cv.getBoundingClientRect();
      st.w = r.width; st.h = r.height;
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      colors = palette();
      if (!st.orbs.length) {
        for (let i = 0; i < 14; i++) st.orbs.push({ x: Math.random() * r.width, y: Math.random() * r.height, r: 14 + Math.random() * 26, vx: 0, vy: -(6 + Math.random() * 10), phase: Math.random() * 6.28, hue: (i % 3) as 0 | 1 | 2 });
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, st.w, st.h);

      if (mode === 'ripples') {
        // A soft drop now and then, so the pond is never completely still.
        if (now - st.lastAuto > 7000 && st.ripples.length < 2) { st.ripples.push({ x: st.w * (0.2 + Math.random() * 0.6), y: st.h * (0.2 + Math.random() * 0.6), t0: now }); st.lastAuto = now; }
        st.ripples = st.ripples.filter((r) => now - r.t0 < 5000);
        for (const r of st.ripples) {
          const t = (now - r.t0) / 5000;
          for (let k = 0; k < 3; k++) {
            const tk = t - k * 0.12;
            if (tk <= 0) continue;
            const alpha = (1 - tk) * 0.5;
            ctx.beginPath();
            if (calmMotion) {
              ctx.fillStyle = rgba(colors.a, alpha * 0.35);
              ctx.arc(r.x, r.y, 40 + k * 22, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.strokeStyle = rgba(k === 1 ? colors.b : colors.a, alpha);
              ctx.lineWidth = 2.5 - k * 0.6;
              ctx.arc(r.x, r.y, 8 + tk * 170, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        }
      }

      if (mode === 'trails') {
        st.sparks = st.sparks.filter((s) => now - s.t0 < 3200);
        for (const s of st.sparks) {
          const t = (now - s.t0) / 3200;
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
          g.addColorStop(0, rgba(colors.b, (1 - t) * 0.45));
          g.addColorStop(1, rgba(colors.b, 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        }
      }

      if (mode === 'drift') {
        const slow = calmMotion ? 0 : 1;
        for (const o of st.orbs) {
          o.phase += dt * 0.5;
          o.x += (o.vx + Math.sin(o.phase) * 6) * dt * slow;
          o.y += o.vy * dt * slow;
          o.vx *= 0.98;
          if (o.y < -o.r) { o.y = st.h + o.r; o.x = Math.random() * st.w; }
          if (o.x < -o.r) o.x = st.w + o.r;
          if (o.x > st.w + o.r) o.x = -o.r;
          const col = [colors.a, colors.b, colors.c][o.hue];
          const glow = calmMotion ? 0.3 + 0.12 * Math.sin(o.phase) : 0.32;
          const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
          g.addColorStop(0, rgba(col, glow));
          g.addColorStop(1, rgba(col, 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const pos = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const down = (e: PointerEvent) => {
      st.down = true; onTouch?.();
      const p = pos(e), now = performance.now();
      if (mode === 'ripples') st.ripples.push({ ...p, t0: now });
      if (mode === 'trails') st.sparks.push({ ...p, t0: now, r: 34 });
      if (mode === 'drift') for (const o of st.orbs) { const dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy); if (d < 120) { o.vx += (dx / (d || 1)) * 30; o.y += (dy / (d || 1)) * 4; } }
    };
    const move = (e: PointerEvent) => {
      if (mode === 'trails' && (st.down || e.pointerType === 'mouse')) { const p = pos(e); st.sparks.push({ ...p, t0: performance.now(), r: 22 + Math.random() * 14 }); if (st.sparks.length > 400) st.sparks.shift(); }
    };
    const up = () => { st.down = false; };
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [mode, calmMotion, onTouch]);

  return <canvas ref={ref} data-testid="calm-canvas" aria-label="A calm space. Tap or trace anywhere." style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', borderRadius: 22, cursor: 'pointer' }} />;
}
