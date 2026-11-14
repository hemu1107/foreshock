import type { Mention } from './scoring';

export type SignalKind = 'chatter' | 'anonymous' | 'echo' | 'on_record' | 'official' | 'denial';
export const signalLabels: Record<SignalKind, { label: string; note: string }> = {
  chatter: { label: 'Chatter', note: 'Social posts, blogs and unsourced mentions' },
  anonymous: { label: 'Anonymous reporting', note: 'Outlets citing people familiar' },
  echo: { label: 'Echoes', note: 'Coverage repeating another outlet' },
  on_record: { label: 'On-record reporting', note: 'Named sources and original reporting' },
  official: { label: 'Official signals', note: 'Statements, filings and releases' },
  denial: { label: 'Pushback', note: 'Denials and rejections' },
};
export const signalOrder: SignalKind[] = ['chatter', 'anonymous', 'echo', 'on_record', 'official', 'denial'];

/** Which weak-signal bucket a mention adds to. Unrelated mentions add nothing. */
export function signalKind(m: Mention): SignalKind | null {
  if (m.stance === 'unrelated') return null;
  if (m.stance === 'denies') return 'denial';
  if (m.sourcing === 'official statement' || m.sourcing === 'filing') return 'official';
  if (m.sourcing === 'cites outlet') return 'echo';
  if (m.sourcing === 'anonymous source') return 'anonymous';
  if (m.sourcing === 'named source' || m.sourcing === 'original reporting') return 'on_record';
  return 'chatter';
}

export function aggregateSignals(mentions: Mention[], now: Date, weeks = 8) {
  const counts = Object.fromEntries(signalOrder.map(k => [k, 0])) as Record<SignalKind, number>;
  const volume = Array.from({ length: weeks }, () => 0);
  const week = 7 * 86400000;
  let total = 0;
  for (const m of mentions) {
    const kind = signalKind(m);
    if (!kind) continue;
    counts[kind]++; total++;
    if (m.published_at) {
      const ago = Math.floor((now.getTime() - new Date(m.published_at).getTime()) / week);
      if (ago >= 0 && ago < weeks) volume[weeks - 1 - ago]!++;
    }
  }
  const recent = volume.at(-1)! + volume.at(-2)!, prior = volume.at(-3)! + volume.at(-4)!;
  const trend = recent > prior ? 'building' : recent < prior ? 'fading' : 'steady';
  return { counts, total, volume, trend } as const;
}