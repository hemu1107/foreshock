import { registrableDomain } from './domains';
import { supersedes } from './official';

export type Status = 'Whisper' | 'Rumor' | 'Corroborated' | 'Confirmed' | 'Denied' | 'Went cold';
export type Sourcing = 'original reporting' | 'cites outlet' | 'named source' | 'anonymous source' | 'official statement' | 'filing' | 'social' | 'unsourced';
export type Stance = 'reports' | 'repeats' | 'confirms' | 'denies' | 'unrelated';
export interface Mention {
  id: string; url: string; title: string; domain: string; outlet: string;
  published_at: string | null; snippet: string; attribution_quotes: string[];
  stance: Stance; sourcing: Sourcing; attributes_to: string | null;
  is_origin: boolean; is_independent: boolean; paywalled: boolean;
  involved_party?: boolean; mainstream?: boolean;
  source_api: 'you_search' | 'you_contents' | 'you_research' | 'treg' | 'opencrawl';
}
export const statusRules: Record<Status, string> = {
  Whisper: 'Only social posts, forums, blogs or unsourced mentions.',
  Rumor: 'Exactly one independent mainstream source. Echoes do not corroborate.',
  Corroborated: 'At least two independent sources on distinct registrable domains.',
  Confirmed: 'An involved party confirms in an official statement, filing or press release.',
  Denied: 'An involved party officially denies the claim, with no later confirmation.',
  'Went cold': 'No new mentions for at least 21 days, unless confirmed or denied.',
};
export function isIndependent(m: Mention) {
  return m.stance !== 'unrelated' && !m.attributes_to && ['original reporting', 'named source', 'anonymous source', 'official statement', 'filing'].includes(m.sourcing);
}
export function scoreMentions(mentions: Mention[], now: Date) {
  const relevant = mentions.filter(m => m.stance !== 'unrelated');
  const independent = new Set(relevant.filter(isIndependent).map(m => registrableDomain(m.domain)));
  const echoes = relevant.filter(m => m.sourcing === 'cites outlet').length;
  const official = relevant.filter(m => m.involved_party && ['official statement', 'filing'].includes(m.sourcing));
  const timestamp = (m: Mention) => m.published_at ? new Date(m.published_at).getTime() : 0;
  const textOf = (m: Mention) => [m.title, m.snippet, ...m.attribution_quotes].join('\n');
  const superseding = official.filter(m => supersedes(textOf(m)));
  const denial = Math.max(0, ...official.filter(m => m.stance === 'denies' && !superseding.includes(m)).map(timestamp));
  const confirmations = official.filter(m => m.stance === 'confirms');
  const confirmed = confirmations.some(m => !denial || timestamp(m) > denial);
  const latest = Math.max(0, ...relevant.map(timestamp));
  const age = latest ? now.getTime() - latest : 0;
  let status: Status = 'Whisper';
  if (confirmed) status = 'Confirmed';
  else if (official.some(m => m.stance === 'denies' && !superseding.includes(m))) status = 'Denied';
  else if (latest && age >= 21 * 86400000) status = 'Went cold';
  else if (independent.size >= 2) status = 'Corroborated';
  else if (independent.size === 1 && relevant.some(m => isIndependent(m) && m.mainstream)) status = 'Rumor';
  const hasNamed = relevant.some(m => m.sourcing === 'named source');
  const recent = relevant.some(m => timestamp(m) && now.getTime() - timestamp(m) >= 0 && now.getTime() - timestamp(m) <= 72 * 3600000);
  const smokeScore = status === 'Confirmed' ? 100 : status === 'Denied' ? 0 : Math.min(100, Math.min(60, independent.size * 20) + Math.min(15, echoes * 3) + (hasNamed ? 15 : 0) + (recent ? 10 : 0));
  const firstConfirm = Math.min(...confirmations.map(timestamp));
  const later = status === 'Confirmed' ? superseding.filter(m => !timestamp(m) || timestamp(m) >= firstConfirm).sort((a, b) => timestamp(b) - timestamp(a))[0] : undefined;
  const superseded = later ? { url: later.url, title: later.title, outlet: later.outlet } : null;
  return { status, smokeScore, independent: independent.size, echoes, superseded };
}