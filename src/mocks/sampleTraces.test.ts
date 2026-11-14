import { describe, expect, it } from 'vitest';
import { sampleTraces, SAMPLE_NOW } from './sampleTraces';
import { scoreMentions } from '@/lib/scoring';

describe('Fictional sample evidence', () => {
  it('includes 14 acquisition mentions, two independent sources and nine echoes', () => {
    const trace = sampleTraces.find(t => t.id === '8f2a9c41');
    expect(trace?.mentions).toHaveLength(14);
    expect(scoreMentions(trace?.mentions ?? [], SAMPLE_NOW)).toMatchObject({ status: 'Corroborated', independent: 2, echoes: 9, smokeScore: 65 });
  });
  it('includes a paywalled origin and two social posts', () => {
    const mentions = sampleTraces.find(t => t.id === '8f2a9c41')?.mentions ?? [];
    expect(mentions.find(m => m.is_origin)?.paywalled).toBe(true);
    expect(mentions.filter(m => m.sourcing === 'social')).toHaveLength(2);
  });
  it('includes a denied sample with an involved-party official denial', () => {
    const mentions = sampleTraces.find(t => t.id === 'd4c7b208')?.mentions ?? [];
    expect(mentions.some(m => m.involved_party && m.sourcing === 'official statement' && m.stance === 'denies')).toBe(true);
    expect(scoreMentions(mentions, SAMPLE_NOW)).toMatchObject({ status: 'Denied', smokeScore: 0 });
  });
});