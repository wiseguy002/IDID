import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import GardenScene from './GardenScene';
import { growthFrom, PLANTS, type GardenPlant, type Season, type Weather } from '../lib/garden';

const plant = (kind: GardenPlant['kind'], moment: number, i: number): GardenPlant => ({ id: `${kind}${i}`, owner: `Part ${i}`, name: '', kind, color: '#999', resting: false, growth: growthFrom({ moment }) });

describe('garden drawing', () => {
  it('draws every plant at every stage, in every weather and season, without errors', () => {
    const weathers: (Weather | null)[] = [null, 'sun', 'clouds', 'breeze', 'rain', 'storm', 'rainbow'];
    const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    for (const w of weathers) for (const s of seasons) for (const calm of [true, false]) {
      const plants = PLANTS.map((p, i) => plant(p.kind, [0, 2, 6, 10, 30][i % 5], i));
      const html = renderToStaticMarkup(<GardenScene plants={plants} weather={w} season={s} calm={calm} label="test" onSelect={() => undefined} />);
      expect(html).toContain('<svg');
      expect(html).not.toMatch(/NaN|undefined/);
      if (w === 'storm' && !calm) expect(html).toContain('g-drop');
      if (s === 'winter') expect(html).toContain('var(--g-snow)');
      if (w === 'rainbow') expect(html).toContain('#a58bd6');
    }
  });

  it('labels each plant for screen readers', () => {
    const html = renderToStaticMarkup(<GardenScene plants={[{ ...plant('rose', 30, 0), owner: 'Ash', name: 'Thorn' }]} weather="sun" season="spring" calm label="Ash's garden" onSelect={() => undefined} />);
    expect(html).toContain('aria-label="Ash: Thorn, Rose, blooming"');
  });
});
