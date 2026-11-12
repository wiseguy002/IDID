/**
 * Draws the Mood Garden: a plant per part (or person), the season, and optional weather.
 * Wind and storms bend the plants but never harm them; Calm motion holds everything still.
 */
import type { CSSProperties, ReactNode } from 'react';
import { plantInfo, STAGES, type GardenPlant, type PlantKind, type Season, type Weather } from '../lib/garden';

const W = 640, H = 360, GROUND = 296;

export function Plant({ kind, stage, flowers, bloom }: { kind: PlantKind; stage: number; flowers: number; bloom: string }) {
  const h = 34 + stage * 30;
  const leaf = 'var(--g-leaf)', leaf2 = 'var(--g-leaf-2)', stem = 'var(--g-stem)';
  const extra = (pts: [number, number][]) => pts.slice(0, Math.max(0, flowers - 1)).map(([x, y], i) => <circle key={`x${i}`} cx={x} cy={y} r={4.5} fill={bloom} />);
  const leafAt = (y: number, side: number, r: number, i: number) => (
    <path key={`l${i}`} d={`M0 ${y} q ${side * r} ${-r * 0.9} ${side * r * 1.8} ${-r * 0.2} q ${-side * r * 0.9} ${r * 0.9} ${-side * r * 1.8} ${r * 0.2}z`} fill={i % 2 ? leaf : leaf2} />
  );
  const stemPath = <path d={`M0 0 C -6 ${-h * 0.4}, 6 ${-h * 0.7}, 0 ${-h}`} stroke={stem} strokeWidth={4} fill="none" strokeLinecap="round" />;
  const leaves = (n: number, r: number) => Array.from({ length: n }, (_, i) => leafAt(-h * (0.22 + i * 0.14), i % 2 ? 1 : -1, r, i));
  const bud = <ellipse cx={0} cy={-h - 4} rx={6} ry={9} fill={bloom} />;

  switch (kind) {
    case 'sunflower':
      return <g>{stemPath}{leaves(1 + stage, 12 + stage * 2)}
        {stage === 3 && bud}
        {stage === 4 && <g transform={`translate(0 ${-h})`}>{Array.from({ length: 12 }, (_, i) => <ellipse key={i} cx={0} cy={-14} rx={5} ry={10} fill={bloom} transform={`rotate(${i * 30})`} />)}<circle r={9} fill="#7a5230" /></g>}
        {extra([[-22, -h * 0.55], [22, -h * 0.7], [-18, -h * 0.3]])}</g>;
    case 'fern': {
      const fronds = 2 + stage * 2, len = 26 + stage * 16;
      return <g>{Array.from({ length: fronds }, (_, i) => {
        const a = -70 + (140 / Math.max(1, fronds - 1)) * i;
        return <g key={i} transform={`rotate(${a})`}><path d={`M0 0 Q ${len * 0.15} ${-len * 0.6} 0 ${-len}`} stroke={i % 2 ? leaf : leaf2} strokeWidth={3} fill="none" strokeLinecap="round" />
          {Array.from({ length: 4 + stage }, (_, k) => <ellipse key={k} cx={(k % 2 ? 5 : -5)} cy={-len * (0.25 + k * 0.13)} rx={5} ry={2.4} fill={i % 2 ? leaf : leaf2} />)}</g>;
      })}{stage >= 3 && Array.from({ length: Math.max(1, flowers) }, (_, i) => <circle key={`s${i}`} cx={-20 + i * 9} cy={-len * 0.9} r={3} fill={bloom} />)}</g>;
    }
    case 'cactus': {
      const ch = 24 + stage * 22;
      return <g><rect x={-11} y={-ch} width={22} height={ch} rx={11} fill={leaf} />
        {stage >= 2 && <path d={`M-11 ${-ch * 0.45} h -10 v -18 a 6 6 0 0 1 12 0`} stroke={leaf2} strokeWidth={10} fill="none" strokeLinecap="round" />}
        {stage >= 3 && <path d={`M11 ${-ch * 0.6} h 10 v -16 a 6 6 0 0 0 -12 0`} stroke={leaf2} strokeWidth={10} fill="none" strokeLinecap="round" />}
        {Array.from({ length: 3 + stage }, (_, i) => <line key={i} x1={i % 2 ? 11 : -11} y1={-ch * (0.2 + i * 0.15)} x2={i % 2 ? 15 : -15} y2={-ch * (0.2 + i * 0.15) - 2} stroke="var(--g-ink)" strokeWidth={1} opacity={0.4} />)}
        {stage === 3 && <circle cy={-ch - 3} r={5} fill={bloom} />}
        {stage === 4 && <g transform={`translate(0 ${-ch - 4})`}>{Array.from({ length: 6 }, (_, i) => <ellipse key={i} cy={-5} rx={3.5} ry={6} fill={bloom} transform={`rotate(${i * 60})`} />)}<circle r={3} fill="#f2c14e" /></g>}
        {extra([[-21, -ch * 0.45 - 20], [21, -ch * 0.6 - 18]])}</g>;
    }
    case 'lavender': {
      const n = 2 + stage;
      return <g>{Array.from({ length: n }, (_, i) => {
        const x = (i - (n - 1) / 2) * 7, sh = h * (0.75 + (i % 3) * 0.1);
        return <g key={i}><path d={`M0 0 Q ${x * 0.5} ${-sh / 2} ${x} ${-sh}`} stroke={stem} strokeWidth={2} fill="none" />
          {stage >= 3 && Array.from({ length: 6 }, (_, k) => <circle key={k} cx={x} cy={-sh + k * 5} r={stage === 4 ? 3.2 : 2.2} fill={bloom} opacity={stage === 4 ? 1 : 0.7} />)}</g>;
      })}{leaves(Math.min(3, stage + 1), 9)}</g>;
    }
    case 'oak': {
      const cr = 14 + stage * 12;
      return <g><path d={`M-4 0 L -3 ${-h * 0.6} L 3 ${-h * 0.6} L 4 0 Z`} fill="#8a6a4a" />
        <circle cy={-h * 0.6 - cr * 0.7} r={cr} fill={leaf} /><circle cx={-cr * 0.6} cy={-h * 0.6 - cr * 0.4} r={cr * 0.7} fill={leaf2} /><circle cx={cr * 0.6} cy={-h * 0.6 - cr * 0.45} r={cr * 0.7} fill={leaf2} />
        {stage >= 3 && Array.from({ length: stage === 4 ? Math.min(10, 2 + flowers) : 2 }, (_, i) => <circle key={i} cx={Math.cos(i * 1.9) * cr * 0.8} cy={-h * 0.6 - cr * 0.7 + Math.sin(i * 1.9) * cr * 0.6} r={3.5} fill={bloom} />)}</g>;
    }
    case 'willow': {
      const th = h * 0.75, n = 3 + stage * 2;
      return <g><path d={`M0 0 C -4 ${-th * 0.5}, 4 ${-th * 0.8}, 0 ${-th}`} stroke="#8a6a4a" strokeWidth={5} fill="none" strokeLinecap="round" />
        {Array.from({ length: n }, (_, i) => { const x = (i - (n - 1) / 2) * 7; return <path key={i} d={`M0 ${-th} Q ${x * 1.6} ${-th - 6} ${x * 2} ${-th + 18 + stage * 10}`} stroke={i % 2 ? leaf : leaf2} strokeWidth={2.5} fill="none" strokeLinecap="round" />; })}
        {stage >= 3 && Array.from({ length: Math.max(2, flowers) }, (_, i) => <circle key={`b${i}`} cx={(i - 1) * 12} cy={-th + 10 + (i % 2) * 8} r={3} fill={bloom} />)}</g>;
    }
    case 'wildflower': {
      const n = 2 + stage, colors = [bloom, '#f2c14e', '#a58bd6', '#e889a8'];
      return <g>{Array.from({ length: n }, (_, i) => {
        const x = (i - (n - 1) / 2) * 10, sh = h * (0.5 + ((i * 37) % 40) / 100);
        return <g key={i}><path d={`M0 0 Q ${x * 0.4} ${-sh / 2} ${x} ${-sh}`} stroke={stem} strokeWidth={2.2} fill="none" />
          {stage >= 3 ? <g transform={`translate(${x} ${-sh})`}>{Array.from({ length: 5 }, (_, k) => <circle key={k} cx={Math.cos(k * 1.256) * 4} cy={Math.sin(k * 1.256) * 4} r={stage === 4 ? 3.4 : 2.4} fill={colors[i % colors.length]} />)}<circle r={2} fill="#fff4cc" /></g>
            : <circle cx={x} cy={-sh} r={2.5} fill={leaf2} />}</g>;
      })}{leaves(Math.min(2, stage), 8)}</g>;
    }
    case 'rose':
      return <g>{stemPath}{leaves(1 + stage, 10)}
        {Array.from({ length: 2 + stage }, (_, i) => <path key={`t${i}`} d={`M${i % 2 ? 1 : -1} ${-h * (0.2 + i * 0.15)} l ${i % 2 ? 4 : -4} -2 l ${i % 2 ? -3 : 3} -2z`} fill={stem} />)}
        {stage === 3 && bud}
        {stage === 4 && <g transform={`translate(0 ${-h - 4})`}><circle r={11} fill={bloom} /><path d="M-6 -2 q 6 -8 12 0 q -6 8 -12 0" fill="none" stroke="var(--g-ink)" strokeOpacity={0.25} strokeWidth={1.5} /><path d="M-3 -1 q 3 -4 6 0" fill="none" stroke="var(--g-ink)" strokeOpacity={0.25} strokeWidth={1.2} /></g>}
        {extra([[-20, -h * 0.6], [20, -h * 0.45]])}</g>;
    case 'moss': {
      const w = 22 + stage * 14;
      return <g><ellipse cx={0} cy={-6} rx={w} ry={8 + stage * 3} fill={leaf} /><ellipse cx={-w * 0.4} cy={-10 - stage} rx={w * 0.5} ry={6 + stage * 2} fill={leaf2} /><ellipse cx={w * 0.45} cy={-9 - stage} rx={w * 0.45} ry={5 + stage * 2} fill={leaf2} />
        {stage >= 3 && Array.from({ length: Math.max(3, flowers + 2) }, (_, i) => <circle key={i} cx={-w * 0.7 + (i * w * 1.4) / Math.max(3, flowers + 2)} cy={-14 - stage * 3 - (i % 2) * 4} r={2.2} fill={bloom} />)}</g>;
    }
    case 'bamboo': {
      const canes = 1 + Math.min(3, stage);
      return <g>{Array.from({ length: canes }, (_, i) => {
        const x = (i - (canes - 1) / 2) * 10, ch = h * (0.85 + (i % 2) * 0.15), seg = 5 + stage;
        return <g key={i}><rect x={x - 3} y={-ch} width={6} height={ch} rx={3} fill={i % 2 ? leaf : leaf2} />
          {Array.from({ length: seg }, (_, k) => <line key={k} x1={x - 3} x2={x + 3} y1={-ch * (k / seg)} y2={-ch * (k / seg)} stroke="var(--g-ink)" strokeOpacity={0.25} />)}
          <path d={`M${x} ${-ch} q 10 -4 16 2 q -10 2 -16 -2`} fill={leaf2} /></g>;
      })}{stage >= 3 && Array.from({ length: Math.max(1, flowers) }, (_, i) => <circle key={`b${i}`} cx={-12 + i * 8} cy={-h * 0.95} r={2.8} fill={bloom} />)}</g>;
    }
  }
}

const SKY: Record<Season, [string, string]> = {
  spring: ['var(--g-sky)', 'var(--g-sky-2)'], summer: ['var(--g-sky-summer)', 'var(--g-sky-2)'],
  autumn: ['var(--g-sky-autumn)', 'var(--g-sky-2)'], winter: ['var(--g-sky-winter)', 'var(--g-sky-2)'],
};

export default function GardenScene({ plants, weather, season, calm, selectedId, onSelect, label }: {
  plants: GardenPlant[]; weather: Weather | null; season: Season; calm: boolean; selectedId?: string | null; onSelect?: (id: string) => void; label: string;
}) {
  const n = plants.length;
  const spacing = W / (n + 1);
  const windy = weather === 'breeze' || weather === 'rain' || weather === 'storm';
  const sway: CSSProperties = { ['--sway' as string]: weather === 'storm' ? '7deg' : windy ? '4deg' : '1.4deg', ['--lean' as string]: weather === 'storm' ? '6deg' : windy ? '3deg' : '0deg' };
  const rainy = weather === 'rain' || weather === 'storm';
  const scale = n > 6 ? 0.7 : n > 4 ? 0.85 : 1;
  const decor: ReactNode[] = [];
  if (season === 'autumn') for (let i = 0; i < 9; i++) decor.push(<ellipse key={`a${i}`} className={calm ? '' : 'g-fall'} style={{ animationDelay: `${i * 0.7}s` }} cx={40 + ((i * 71) % 560)} cy={60 + ((i * 43) % 150)} rx={5} ry={3} fill={i % 2 ? '#d98c4e' : '#c9a44a'} opacity={0.8} />);

  return (
    <svg className={`garden-scene${calm ? ' calm' : ''}`} viewBox={`0 0 ${W} ${H}`} role="group" aria-label={label} style={sway}>
      <defs><linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={rainy ? 'var(--g-sky-rain)' : SKY[season][0]} /><stop offset="1" stopColor={SKY[season][1]} /></linearGradient></defs>
      <rect width={W} height={H} fill="url(#g-sky)" />
      {/* Weather */}
      {(weather === 'sun' || weather === null || weather === 'rainbow' || season === 'summer') && !rainy && <circle cx={560} cy={64} r={30} fill="var(--g-sun)" />}
      {weather === 'rainbow' && <g fill="none" strokeWidth={9} opacity={0.75}>{['#e47b7b', '#f2b05e', '#f2d86b', '#8fc48a', '#7fa6d9', '#a58bd6'].map((c, i) => <path key={c} d={`M60 ${GROUND} A 260 220 0 0 1 580 ${GROUND}`} stroke={c} transform={`translate(0 ${i * 9}) translate(320 ${GROUND}) scale(1 ${1 - i * 0.03}) translate(-320 ${-GROUND})`} />)}</g>}
      {weather && weather !== 'sun' && weather !== 'rainbow' && [[90, 70, 1], [430, 58, rainy ? 1.25 : 0.85], ...(weather === 'storm' ? [[250, 48, 1.3]] : [])].map(([cx, cy, k], i) => (
        <g key={`c${i}`} className={calm ? '' : 'g-drift'} opacity={0.95}>{[[0, 0, 26], [24, -10, 22], [46, 2, 20], [22, 8, 22]].map(([dx, dy, r], j) => <circle key={j} cx={cx + dx * k} cy={cy + dy * k} r={r * k} fill={weather === 'storm' ? 'var(--g-storm)' : 'var(--g-cloud)'} />)}</g>
      ))}
      {windy && Array.from({ length: weather === 'breeze' ? 3 : 5 }, (_, i) => <path key={`w${i}`} className={calm ? '' : 'g-gust'} style={{ animationDelay: `${i * 0.6}s` }} d={`M${40 + i * 120} ${130 + (i % 2) * 26} q 30 -12 60 0 t 60 0`} stroke="var(--g-ink)" strokeOpacity={0.25} strokeWidth={2} fill="none" strokeLinecap="round" />)}
      {rainy && Array.from({ length: weather === 'storm' ? 44 : 26 }, (_, i) => { const x = 10 + ((i * 97) % 620), y = 90 + ((i * 53) % 170); return <line key={`r${i}`} className={calm ? '' : 'g-drop'} style={{ animationDelay: `${(i % 8) * 0.2}s` }} x1={x} y1={y} x2={x - (weather === 'storm' ? 7 : 3)} y2={y + 12} stroke="var(--g-rain)" strokeWidth={2} strokeLinecap="round" />; })}
      {decor}
      {/* Ground */}
      <path d={`M0 ${GROUND} Q 160 ${GROUND - 14} 320 ${GROUND - 2} T ${W} ${GROUND - 4} V ${H} H 0 Z`} fill="var(--g-soil)" />
      <path d={`M0 ${GROUND + 30} Q 210 ${GROUND + 18} 420 ${GROUND + 30} T ${W} ${GROUND + 26} V ${H} H 0 Z`} fill="var(--g-soil-2)" opacity={0.7} />
      {season === 'winter' && <path d={`M0 ${GROUND + 2} Q 160 ${GROUND - 12} 320 ${GROUND} T ${W} ${GROUND - 2} V ${GROUND + 10} H 0 Z`} fill="var(--g-snow)" />}
      {/* Plants */}
      {plants.map((p, i) => {
        const info = plantInfo(p.kind);
        const x = spacing * (i + 1);
        const sel = selectedId === p.id;
        return (
          <g key={p.id} className="g-plant" transform={`translate(${x} ${GROUND})`} tabIndex={onSelect ? 0 : -1} role={onSelect ? 'button' : 'img'}
            aria-label={`${p.owner}: ${p.name ? `${p.name}, ` : ''}${info.label}, ${STAGES[p.growth.stage].toLowerCase()}${p.resting ? ', resting' : ''}`}
            onClick={() => onSelect?.(p.id)} onKeyDown={(e) => { if (onSelect && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(p.id); } }}>
            <rect x={-spacing / 2 + 4} y={-250} width={spacing - 8} height={290} fill="transparent" rx={14} className="g-hit" />
            <ellipse cx={0} cy={4} rx={30 * scale} ry={7} fill="var(--g-soil-2)" />
            <g transform={`scale(${scale})`}><g className={calm ? 'g-lean' : 'g-sway'} style={{ animationDelay: `${i * 0.4}s` }}>
              <Plant kind={p.kind} stage={p.growth.stage} flowers={p.growth.flowers} bloom={info.bloom} />
            </g></g>
            <g transform="translate(0 22)">
              <rect x={-44} y={-12} width={88} height={24} rx={12} fill={sel ? 'var(--accent)' : 'var(--surface)'} stroke="var(--line)" />
              <text textAnchor="middle" y={4} fontSize={12} fontWeight={700} fill={sel ? 'var(--accent-ink)' : 'var(--ink)'}>{(p.name || p.owner).slice(0, 12)}</text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
