import { describe, expect, it } from 'vitest';
import { sampleTraces } from '@/mocks/sampleTraces';
import { exportMarkdownBrief, numberedVerdict, isCachedCheck } from './brief';
import { layoutSpread } from './spread';

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
});