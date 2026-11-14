import type { Mention, Stance, Sourcing } from './scoring';
import { outlets, registrableDomain } from './domains';

// Deterministic official-statement and attribution rules shared by live classification, scoring and the UI.
const WIRE_DOMAINS = ['prnewswire.com', 'businesswire.com', 'globenewswire.com', 'newswire.ca', 'cnw.ca'];
const NEVER_OFFICIAL = ['wikipedia.org', 'seekingalpha.com', 'fool.com', 'benzinga.com', 'marketbeat.com', 'investing.com', 'zacks.com', 'tipranks.com', 'yahoo.com', 'msn.com', 'medium.com', 'substack.com', 'blogspot.com', 'wordpress.com', 'tumblr.com', 'reddit.com', 'x.com', 'twitter.com', 'ycombinator.com', 'stocktitan.net', 'marketscreener.com', 'finviz.com', 'newsbreak.com', 'flipboard.com', 'ground.news'];
const CONFIRM = /entered into a definitive (merger )?agreement|signs? (a )?definitive (merger )?agreement|signed a definitive (merger )?agreement|agreed to (acquire|buy|sell)|announced (that )?it will acquire|to acquire|will acquire|completes? (the |its )?acquisition/i;
const DENY = /\bend(ed|s)? (the )?(merger |acquisition )?talks|terminated (the )?talks|walked away from (the )?talks|rejected (the |an |its |a )?(\w+ )?(offer|bid|proposal|approach)|(is|are|was|were) not in (any )?(discussions|talks)|no longer in (discussions|talks)/i;
const SUPERSEDE = /higher (offer|bid)|declin(e|es|ed|ing) to (raise|match)|superior (proposal|offer|bid)|rival (bid|offer) (was )?accepted|accepted (a |the )?rival (bid|offer)|agreed to be acquired by|terminat(ed|es|e|ing)|walked away/i;
// A different company as the sentence subject buying the target, e.g. "Paramount Completes Acquisition of Warner Bros."
const THIRD_PARTY_BUY = /^(?:[A-Z][\w&.'-]*(?:\s+[A-Z][\w&.'-]*){0,3})\s+(?:completes?|completed|has completed|closes?|closed)\s+(?:the\s+|its\s+)?(?:acquisition|purchase|merger)\s+(?:of|with)\b|^(?:[A-Z][\w&.'-]*(?:\s+[A-Z][\w&.'-]*){0,3})\s+(?:to acquire|acquires|agrees to acquire|agreed to acquire|will acquire)\b/i;
const NON_COMMITTAL = /declined to comment|does not comment on (rumou?rs|speculation|market speculation)|unable to confirm/i;

const compact = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');
const names = (parties: string[]) => parties.map(p => p.trim().split(/\s+/)[0]?.toLowerCase() ?? '').filter(p => p.length > 1);
const sentences = (text: string) => text.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
const has = (s: string, name: string) => s.toLowerCase().includes(name);
const hostOf = (url: string) => { try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };
const onDomain = (host: string, list: string[]) => list.some(d => host === d || host.endsWith(`.${d}`));

export function neverOfficial(url: string) { return onDomain(hostOf(url), NEVER_OFFICIAL); }
const corporateHost = (url: string) => { try { const u = new URL(url); return /^(investor|investors|ir|news|newsroom|press|media)\./i.test(u.hostname.replace(/^www\./, '')) || /\/newsroom\/|\/press-release|\/press\/|\/news-releases?\//i.test(u.pathname); } catch { return false; } };
/** Wire releases, SEC filings, and investor/news pages on either company's own domain. */
export function officialSource(url: string, parties: string[] = []) {
  const host = hostOf(url);
  if (!host || neverOfficial(url)) return false;
  if (onDomain(host, ['sec.gov', ...WIRE_DOMAINS])) return true;
  const own = !parties.length || names(parties).some(n => compact(registrableDomain(host)).includes(compact(n)));
  return own && corporateHost(url);
}
/** Any company's own release or a wire/filing — used for third-party superseding statements (e.g. a rival buyer). */
const anyCompanyRelease = (url: string) => { const host = hostOf(url); return Boolean(host) && !neverOfficial(url) && (onDomain(host, ['sec.gov', ...WIRE_DOMAINS]) || (corporateHost(url) && !outlets[registrableDomain(host)])); };

export function supersedeSignal(text: string, parties: string[]) {
  const [a, b] = names(parties);
  return sentences(text).some(s => (b ? has(s, b) : a ? has(s, a) : true) && (SUPERSEDE.test(s) || (Boolean(a && b) && THIRD_PARTY_BUY.test(s) && !has(s, a!))));
}
export function supersedes(text: string, parties: string[] = []) { return parties.length ? supersedeSignal(text, parties) : SUPERSEDE.test(text); }

export type OfficialSignal = 'confirms' | 'denies' | 'non_committal' | null;
export function officialSignal(text: string, parties: string[]): OfficialSignal {
  const all = sentences(text), n = names(parties);
  const party = all.filter(s => n.some(x => has(s, x)));
  const both = (s: string) => n.length < 2 || n.every(x => has(s, x));
  if (party.some(s => DENY.test(s))) return 'denies';
  if (party.some(s => both(s) && CONFIRM.test(s) && !NON_COMMITTAL.test(s))) return 'confirms';
  if (all.some(s => NON_COMMITTAL.test(s))) return 'non_committal';
  return null;
}
const textOf = (m: Pick<Mention, 'title' | 'snippet' | 'attribution_quotes'>) => [m.title, m.snippet, ...m.attribution_quotes].join('\n');

/** Overrides AI labels: only official sources confirm; mislabelled "official" pages are downgraded. */
export function applyOfficialRules<T extends Pick<Mention, 'url' | 'title' | 'snippet' | 'attribution_quotes' | 'stance' | 'sourcing' | 'involved_party' | 'mainstream'>>(m: T, parties: string[]): T {
  const text = textOf(m), signal = officialSignal(text, parties), official = officialSource(m.url, parties);
  const filing = /sec\.gov/i.test(m.url);
  const mentionsParty = names(parties).some(n => has(text, n));
  let stance: Stance = m.stance, sourcing: Sourcing = m.sourcing, involved = Boolean(m.involved_party);
  if (official) {
    sourcing = filing ? 'filing' : 'official statement';
    involved = mentionsParty;
    if (signal === 'confirms' || signal === 'denies') stance = signal;
    else if (stance === 'confirms' || stance === 'denies') stance = 'reports';
    if (supersedeSignal(text, parties) && (stance === 'denies' || stance === 'unrelated')) stance = 'reports';
  } else if (anyCompanyRelease(m.url) && supersedeSignal(text, parties)) {
    sourcing = filing ? 'filing' : 'official statement'; involved = true; stance = 'reports';
  } else {
    if (sourcing === 'official statement' || sourcing === 'filing') { sourcing = 'named source'; involved = false; }
    if (stance === 'confirms') stance = 'reports';
    // An on-record rejection by a party, relayed by a mainstream outlet, still counts as an official denial.
    if (signal === 'denies' && m.mainstream && !neverOfficial(m.url)) { sourcing = 'official statement'; involved = true; stance = 'denies'; }
    else if (stance === 'denies') stance = 'reports';
  }
  return { ...m, stance, sourcing, involved_party: involved };
}

// ---- Echo vs independent ----
const KNOWN_OUTLETS = [...new Set([...Object.values(outlets).map(o => o.name), 'Wall Street Journal', 'The Wall Street Journal', 'New York Times', 'Financial Times', 'FT', 'Deadline', 'Variety', 'The Hollywood Reporter', 'Puck', 'Sky News', 'Nikkei', 'Yonhap', 'Korea Economic Daily', 'Dealreporter', 'Betaville', 'Dow Jones', 'CNBC', 'Bloomberg News', 'The Information', 'Semafor', 'Axios', 'Reuters'])]
  .filter(n => !['X', 'Reddit', 'Hacker News', 'SEC EDGAR', 'PR Newswire', 'Business Wire', 'GlobeNewswire', 'Yahoo Finance', 'Inc.'].includes(n)).sort((a, b) => b.length - a.length);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const OUTLET = `(${KNOWN_OUTLETS.map(esc).join('|')})`;
const ECHO_PATTERNS = [
  new RegExp(`${OUTLET}(?:'s?)?\\s+(?:first\\s+)?(?:reported|relayed|said in a report|broke the news)`, 'g'),
  new RegExp(`according to (?:a |an )?(?:report (?:by|from|in) |people (?:familiar )?cited by )?${OUTLET}`, 'g'),
  new RegExp(`per (?:a |an )?${OUTLET} report`, 'g'),
  new RegExp(`(?:as |was )?first reported by ${OUTLET}`, 'g'),
  new RegExp(`citing (?:a |an )?(?:report|story|article) (?:by|from|in) ${OUTLET}`, 'g'),
  new RegExp(`${OUTLET} (?:reports|has reported|said on \\w+, citing)`, 'g'),
];
const same = (a: string, b: string) => { const x = compact(a).replace(/^the/, '').replace(/news$/, ''), y = compact(b).replace(/^the/, '').replace(/news$/, ''); return Boolean(x && y) && (x === y || x.includes(y) || y.includes(x) || (x === 'wsj' && y.includes('wallstreetjournal')) || (y === 'wsj' && x.includes('wallstreetjournal'))); };
/** Another outlet this mention attributes the news to, or null. */
export function attributedOutlet(text: string, own: { outlet: string; domain: string }) {
  for (const re of ECHO_PATTERNS) for (const match of text.matchAll(re)) { const name = match[1]!; if (!same(name, own.outlet) && !same(name, registrableDomain(own.domain).split('.')[0]!)) return name; }
  return null;
}
/** True when the mention claims its own sourcing ("told Reuters", "sources told CNBC", "citing its own sources"). */
export function ownSourcing(text: string, own: { outlet: string; domain: string }) {
  if (/citing its own sources|told this (outlet|publication|newspaper)|sources told us|told [A-Z][\w ]{0,30} exclusively/i.test(text)) return true;
  for (const m of text.matchAll(new RegExp(`(?:told|sources told|people familiar[^.]{0,60}told|according to people[^.]{0,40}spoke to)\\s+${OUTLET}`, 'gi'))) {
    const name = m[1]!; if (same(name, own.outlet) || same(name, registrableDomain(own.domain).split('.')[0]!)) return true;
  }
  return false;
}
const PARAPHRASE = /people familiar|person familiar|sources familiar|familiar with the (matter|situation|talks|discussions)|people with knowledge/i;

/** Rule-based echo/independent overrides applied after AI classification, using contents-derived quotes. */
export function applyEchoRules<T extends Mention>(mentions: T[], origin: { id: string; outlet: string; published_at: string | null } | undefined): T[] {
  return mentions.map(m => {
    if (m.stance === 'unrelated' || ['official statement', 'filing', 'social'].includes(m.sourcing)) return m;
    const text = textOf(m), own = ownSourcing(text, m), other = attributedOutlet(text, m);
    if (other && !own) return { ...m, sourcing: 'cites outlet' as Sourcing, attributes_to: other };
    if (own) return { ...m, sourcing: (['cites outlet', 'unsourced'].includes(m.sourcing) ? 'anonymous source' : m.sourcing) as Sourcing, attributes_to: null };
    const after = Boolean(origin?.published_at && m.published_at && m.published_at > origin.published_at);
    if (origin && m.id !== origin.id && after && !m.mainstream && PARAPHRASE.test(text)) return { ...m, sourcing: 'cites outlet' as Sourcing, attributes_to: origin.outlet };
    return m;
  });
}

/** Company names for queries and party detection: explicit entities first, then the claim's "A ... acquire B" shape. */
export function dealParties(claim: string, entities: string[]): [string, string] {
  const m = claim.match(/^(.+?)\s+(?:is\s+)?(?:in (?:advanced )?talks to |to |plans to |may |will )?(?:acquire|buy|purchase|merge with)s?\s+(.+?)(?:\s+for\b.*)?$/i);
  return [entities[0]?.trim() || m?.[1]?.trim() || claim, entities[1]?.trim() || m?.[2]?.trim() || ''];
}
