import { describe, expect, it } from 'vitest';
import { sampleTraces } from '@/mocks/sampleTraces';
import { exportMarkdownBrief, numberedVerdict, isCachedCheck } from './brief';
import { layoutSpread, spreadTime } from './spread';
import { countAt } from './display';

const trace = sampleTraces[0];
if (!trace) throw new Error('Missing test fixture');
describe('Trace presentation rules', () => {
  it('labels saved checks cached but not fresh, sample or processing evidence', () => {
    expect(isCachedCheck(false, 'done', '2026-11-14T17:26:00Z')).toBe(true);
    expect(isCachedCheck(false, 'done', '2026-11-14T17:26:00Z', '2026-11-14T17:26:00Z')).toBe(false);
    expect(isCachedCheck(true, 'done', '2026-11-14T17:26:00Z')).toBe(false);
    expect(isCachedCheck(false, 'reading', '2026-11-14T17:26:00Z')).toBe(false);
  });
  it('exports concrete origin, independent counts, echoes, confidence and timestamps', () => {
    const result = exportMarkdownBrief(trace, true, new Date('2026-11-14T17:26:00Z'));
    expect(result).toContain('**Independent sources:** 2');
    expect(result).toContain('**Echo count:** 9');
    expect(result).toContain('**Confidence in assigned status:** 86%');
    expect(result).toContain('[1] **Bloomberg**');
    expect(result).toContain('Exported: 2026-11-14T17:26:00.000Z');
  });
  it('numbered verdict citations match source evidence order', () => {
    const source = trace.mentions[1];
    if (!source) throw new Error('Missing source');
    expect(numberedVerdict({ ...trace, summary_md: `See [Reuters](${source.url}).` })).toBe('See [Reuters][2].');
  });
  it('separates 30 simultaneous reports without dropping evidence', () => {
    const source = trace.mentions[0];
    if (!source) throw new Error('Missing source');
    const mentions = Array.from({length: 30}, (_, i) => ({...source, id: `dense-${i}`, is_origin: false}));
    const { nodes } = layoutSpread(mentions, new Date(trace.checked_at));
    expect(nodes).toHaveLength(30);
    expect(new Set(nodes.map(n => `${n.x}:${n.y}`)).size).toBe(30);
  });
  it('clusters same-source echoes and preserves all 35 members', () => {
    const source = trace.mentions[2];
    if (!source) throw new Error('Missing echo');
    const mentions = Array.from({length:35}, (_, i) => ({...source, id:`echo-${i}`}));
    const { nodes } = layoutSpread(mentions, new Date(trace.checked_at));
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.members).toHaveLength(35);
  });
  it('reveals spread markers in chronological order during replay', () => {
    const source = trace.mentions[0];
    if (!source) throw new Error('Missing source');
    const base = Date.parse(trace.checked_at);
    const mentions = [0, 1, 2, 3].map(i => ({ ...source, id: `day-${i}`, published_at: new Date(base - i * 86400000).toISOString() }));
    const { nodes, min, max } = layoutSpread(mentions, new Date(base));
    expect(nodes).toHaveLength(4);
    const daysApart = nodes.map(n => Math.round((base - spreadTime(n, min, max)) / 86400000)).sort((a, b) => a - b);
    expect(daysApart).toEqual([0, 1, 2, 3]);
    const half = min + (max - min) / 2;
    expect(nodes.filter(n => spreadTime(n, min, max) <= half).map(n => n.id).sort()).toEqual(['day-2', 'day-3']);
  });
  it('counts up to the exact real number and never past it', () => {
    expect(countAt(115, 0)).toBe(0);
    expect(countAt(115, 1)).toBe(115);
    expect(countAt(115, 2)).toBe(115);
    expect(countAt(115, -1)).toBe(0);
    const steps = [0.1, 0.25, 0.5, 0.75, 0.9].map(t => countAt(115, t));
    expect(steps.every((v, i) => i === 0 || v >= steps[i - 1]!)).toBe(true);
    expect(steps.every(v => v <= 115)).toBe(true);
  });
});