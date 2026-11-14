import type { Mention, Stance, Sourcing } from './scoring';

// Deterministic official-statement rules shared by live classification and scoring.
const OFFICIAL_DOMAINS = ['sec.gov', 'prnewswire.com', 'businesswire.com', 'globenewswire.com'];
const CONFIRM = /entered into a definitive (merger )?agreement|signs? (a )?definitive (merger )?agreement|signed a definitive (merger )?agreement|agreed to (acquire|buy|sell)|announced (that )?it will acquire/i;
const STATEMENT_CONFIRM = /said in a statement/i;
const STATEMENT_DEAL = /\b(agree[ds]?|agreement|acquire[sd]?|acquisition|deal|merger|confirm(s|ed)?)\b/i;
const DENY = /\bend(ed|s)? (the )?(merger |acquisition )?talks|terminated (the )?talks|walked away from talks|rejected (the |an |its |a )?(\w+ )?(offer|bid|proposal|approach)|(is|are|was|were) not in (any )?(discussions|talks)|no longer in (discussions|talks)/i;
const SUPERSEDE = /terminat(ed|es|e|ing) (the |its )?(definitive |merger )?agreement|agreement (was|has been|had been) terminated|superior (proposal|offer|bid)/i;
const NON_COMMITTAL = /declined to comment|does not comment on (rumou?rs|speculation|market speculation)|unable to confirm/i;

const compact = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');
/** Wire services and filings always count; investor/news hosts and newsroom paths count only on a party's own site. */
export function officialSource(url: string, parties: string[] = []) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (OFFICIAL_DOMAINS.some(d => host === d || host.endsWith(`.${d}`))) return true;
    const own = !parties.length || names(parties).some(n => compact(host).includes(compact(n)));
    return own && (/^(investor|investors|ir|news|newsroom)\./.test(host) || /\/newsroom\/|\/press-release/i.test(u.pathname));
  } catch { return false; }
}
export function supersedes(text: string) { return SUPERSEDE.test(text); }
const sentences = (text: string) => text.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
const names = (parties: string[]) => parties.map(p => p.trim().split(/\s+/)[0]?.toLowerCase() ?? '').filter(p => p.length > 1);
const byParty = (sentence: string, parties: string[]) => { const s = sentence.toLowerCase(); return names(parties).some(n => s.includes(n)); };

export type OfficialSignal = 'confirms' | 'denies' | 'supersedes' | 'non_committal' | null;
export function officialSignal(text: string, parties: string[]): OfficialSignal {
  const all = sentences(text);
  const party = all.filter(s => byParty(s, parties));
  if (party.some(s => SUPERSEDE.test(s))) return 'supersedes';
  if (party.some(s => DENY.test(s))) return 'denies';
  const both = (s: string) => names(parties).length < 2 || names(parties).every(n => s.toLowerCase().includes(n));
  if (party.some(s => both(s) && (CONFIRM.test(s) || (STATEMENT_CONFIRM.test(s) && STATEMENT_DEAL.test(s) && !NON_COMMITTAL.test(s) && !DENY.test(s))))) return 'confirms';
  if (all.some(s => NON_COMMITTAL.test(s))) return 'non_committal';
  return null;
}

/** Overrides AI labels where the deterministic official-statement rules are decisive. */
export function applyOfficialRules<T extends Pick<Mention, 'url' | 'title' | 'snippet' | 'attribution_quotes' | 'stance' | 'sourcing' | 'involved_party'>>(m: T, parties: string[]): T {
  const text = [m.title, m.snippet, ...m.attribution_quotes].join('\n');
  const signal = officialSignal(text, parties);
  const officialHost = officialSource(m.url, parties);
  const mentionsParty = byParty(text, parties);
  let stance: Stance = m.stance, sourcing: Sourcing = m.sourcing, involved = Boolean(m.involved_party);
  if (signal === 'confirms' || signal === 'denies' || signal === 'supersedes') {
    sourcing = /sec\.gov/i.test(m.url) ? 'filing' : 'official statement';
    involved = true;
    stance = signal === 'confirms' ? 'confirms' : signal === 'denies' ? 'denies' : 'reports';
  } else if (officialHost && mentionsParty) {
    sourcing = /sec\.gov/i.test(m.url) ? 'filing' : 'official statement';
    involved = stance !== 'unrelated';
  } else if (signal === 'non_committal' && (stance === 'confirms' || stance === 'denies')) {
    stance = 'reports';
    if (sourcing === 'official statement' || sourcing === 'filing') { sourcing = 'unsourced'; involved = false; }
  }
  return { ...m, stance, sourcing, involved_party: involved };
}

/** Company names for queries and party detection: explicit entities first, then the claim's "A ... acquire B" shape. */
export function dealParties(claim: string, entities: string[]): [string, string] {
  const m = claim.match(/^(.+?)\s+(?:is\s+)?(?:in (?:advanced )?talks to |to |plans to |may |will )?(?:acquire|buy|purchase|merge with)s?\s+(.+?)(?:\s+for\b.*)?$/i);
  const a = entities[0]?.trim() || m?.[1]?.trim() || claim;
  const b = entities[1]?.trim() || m?.[2]?.trim() || '';
  return [a, b];
}
