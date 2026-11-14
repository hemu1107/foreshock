import { describe, it, expect } from 'vitest';
import { aggregateSignals, signalKind } from './signals';
import type { Mention } from './scoring';
const m = (o: Partial<Mention>): Mention => ({ id: Math.random().toString(), url: 'https://a.com', title: '', domain: 'a.com', outlet: 'A', published_at: '2026-11-10T00:00:00Z', snippet: '', attribution_quotes: [], stance: 'reports', sourcing: 'unsourced', attributes_to: null, is_origin: false, is_independent: false, paywalled: false, source_api: 'you_search', ...o });
describe('weak-signal aggregation', () => {
  it('buckets mentions by signal kind', () => {
    expect(signalKind(m({ sourcing: 'social' }))).toBe('chatter');
    expect(signalKind(m({ sourcing: 'cites outlet', stance: 'repeats' }))).toBe('echo');
    expect(signalKind(m({ sourcing: 'anonymous source' }))).toBe('anonymous');
    expect(signalKind(m({ stance: 'denies', sourcing: 'official statement' }))).toBe('denial');
    expect(signalKind(m({ stance: 'unrelated' }))).toBeNull();
  });
  it('marks a signal as building when the last two weeks outpace the two before', () => {
    const now = new Date('2026-11-14T00:00:00Z');
    const r = aggregateSignals([m({}), m({}), m({ published_at: '2026-10-25T00:00:00Z' }), m({ stance: 'unrelated' })], now);
    expect(r.total).toBe(3);
    expect(r.trend).toBe('building');
  });
});