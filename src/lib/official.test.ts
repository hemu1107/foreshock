import { describe, it, expect } from 'vitest';
import { applyOfficialRules, applyEchoRules, officialSource, dealParties } from './official';
import { scoreMentions, type Mention } from './scoring';
import { officialQueries } from './pipeline';

const now = new Date('2026-11-14T12:00:00Z');
const parties = ['Samsung', 'Modine'];
let n = 0;
const m = (over: Partial<Mention>): Mention => ({ id: `m${n++}`, url: 'https://www.reuters.com/a', title: '', domain: 'reuters.com', outlet: 'Reuters', published_at: '2026-11-10T00:00:00Z', snippet: '', attribution_quotes: [], stance: 'reports', sourcing: 'anonymous source', attributes_to: null, is_origin: false, is_independent: false, paywalled: false, involved_party: false, mainstream: true, source_api: 'you_search', ...over });
const ruled = (x: Mention) => applyOfficialRules(x, parties);

describe('official statement rules', () => {
  it('adds the four official-statement search queries per trace', () => {
    expect(officialQueries('Samsung in talks to acquire Modine', [])).toEqual((['Samsung Modine definitive agreement', 'Samsung press release Modine', 'Modine statement Samsung', 'Samsung Modine ends talks']));
    expect(dealParties('Netflix to acquire Warner Bros', [])).toEqual(['Netflix', 'Warner Bros']);
  });
  it('recognises official domains, investor hosts and newsroom paths', () => {
    expect(officialSource('https://www.prnewswire.com/news/x')).toBe(true);
    expect(officialSource('https://investor.modine.com/news')).toBe(true);
    expect(officialSource('https://example.com/newsroom/deal')).toBe(true);
    expect(officialSource('https://www.reuters.com/markets/deal')).toBe(false);
    expect(officialSource('https://news.samsung.com/global/x', parties)).toBe(true);
    expect(officialSource('https://news.metal.com/samsung-modine', parties)).toBe(false);
  });
  it('definitive-agreement press release makes the trace Confirmed', () => {
    const pr = ruled(m({ url: 'https://www.businesswire.com/news/home/1', domain: 'businesswire.com', title: 'Samsung signs definitive agreement to acquire Modine', stance: 'reports', sourcing: 'unsourced' }));
    expect(pr).toMatchObject({ sourcing: 'official statement', stance: 'confirms', involved_party: true });
    expect(scoreMentions([m({}), pr], now).status).toBe('Confirmed');
  });
  it('target rejecting the offer in an internal memo reported on-record is Denied', () => {
    const memo = ruled(m({ snippet: 'Modine rejected the unsolicited offer from Samsung, CEO Neil Brinker wrote in an internal memo seen by Reuters.', sourcing: 'named source' }));
    expect(memo.stance).toBe('denies');
    expect(scoreMentions([m({ domain: 'bloomberg.com' }), memo], now).status).toBe('Denied');
  });
  it('only "unable to confirm" plus anonymous reports stays a Rumor', () => {
    const report = ruled(m({ snippet: 'Samsung is in talks to acquire Modine, people familiar said. Reuters was unable to confirm the report.', stance: 'confirms' }));
    expect(report.stance).toBe('reports');
    expect(scoreMentions([report], now).status).toBe('Rumor');
  });
  it('agreement later terminated stays Confirmed and flags Later superseded', () => {
    const pr = ruled(m({ url: 'https://www.prnewswire.com/news/1', domain: 'prnewswire.com', title: 'Samsung entered into a definitive agreement to acquire Modine', published_at: '2026-10-01T00:00:00Z' }));
    const end = ruled(m({ url: 'https://investor.modine.com/news/2', domain: 'modine.com', title: 'Modine terminated the merger agreement with Samsung after receiving a superior proposal', published_at: '2026-11-01T00:00:00Z', stance: 'denies' }));
    const score = scoreMentions([pr, end], now);
    expect(score.status).toBe('Confirmed');
    expect(score.superseded?.url).toBe('https://investor.modine.com/news/2');
  });
  it('a deal phrase naming only one party is not an official confirmation', () => {
    expect(ruled(m({ snippet: 'Paramount agreed to acquire Modine last year.' })).stance).toBe('reports');
  });
  it('"declined to comment" is neither a denial nor a confirmation', () => {
    const x = ruled(m({ snippet: 'Modine declined to comment.', stance: 'denies', sourcing: 'official statement', involved_party: true }));
    expect(x.stance).toBe('reports');
    expect(scoreMentions([x], now).status).not.toBe('Denied');
  });
  it('Reuters relaying a Bloomberg report citing people familiar is an echo', () => {
    const r = m({ snippet: 'Samsung is in talks to acquire Modine, Bloomberg reported on Thursday, citing people familiar with the matter.', sourcing: 'anonymous source' });
    const [out] = applyEchoRules([r], undefined);
    expect(out).toMatchObject({ sourcing: 'cites outlet', attributes_to: 'Bloomberg' });
    expect(scoreMentions([out!], now).independent).toBe(0);
  });
  it('an article whose sources told Reuters is independent', () => {
    const r = m({ snippet: 'Samsung is in talks to buy Modine, two sources told Reuters.', sourcing: 'cites outlet', attributes_to: 'bloomberg.com' });
    const [out] = applyEchoRules([r], undefined);
    expect(out).toMatchObject({ sourcing: 'anonymous source', attributes_to: null });
    expect(scoreMentions([out!], now).independent).toBe(1);
  });
  it('non-major outlets paraphrasing people familiar after the origin are echoes', () => {
    const origin = m({ domain: 'bloomberg.com', outlet: 'Bloomberg', published_at: '2026-11-09T00:00:00Z' });
    const blog = m({ domain: 'smallsite.com', outlet: 'smallsite.com', mainstream: false, snippet: 'Samsung is said to be in talks for Modine, according to people familiar with the matter.' });
    expect(applyEchoRules([origin, blog], origin)[1]).toMatchObject({ sourcing: 'cites outlet', attributes_to: 'Bloomberg' });
  });
  it('a Wikipedia "agreed to buy" line is not an official confirmation', () => {
    const wiki = ruled(m({ url: 'https://en.wikipedia.org/wiki/Modine', domain: 'wikipedia.org', snippet: 'In 2026 Samsung agreed to buy Modine.', sourcing: 'official statement', stance: 'confirms', involved_party: true }));
    expect(wiki).toMatchObject({ stance: 'reports', involved_party: false });
    expect(wiki.sourcing).not.toBe('official statement');
    expect(scoreMentions([wiki], now).status).not.toBe('Confirmed');
  });
  it('a Paramount press release acquiring Warner Bros supersedes a confirmed Netflix–WBD deal', () => {
    const nw = ['Netflix', 'Warner Bros'];
    const netflix = applyOfficialRules(m({ url: 'https://about.netflix.com/en/newsroom/netflix-to-acquire-warner-bros', domain: 'netflix.com', title: 'Netflix to Acquire Warner Bros.', snippet: 'Netflix entered into a definitive agreement to acquire Warner Bros.', published_at: '2025-12-05T00:00:00Z' }), nw);
    const paramount = applyOfficialRules(m({ url: 'https://www.prnewswire.com/news-releases/paramount-completes-acquisition-of-warner-bros-discovery-302.html', domain: 'prnewswire.com', title: 'Paramount Completes Acquisition of Warner Bros. Discovery', stance: 'unrelated', sourcing: 'unsourced', published_at: '2026-10-06T00:00:00Z' }), nw);
    expect(netflix.stance).toBe('confirms');
    const score = scoreMentions([netflix, paramount], now, nw);
    expect(score.status).toBe('Confirmed');
    expect(score.superseded?.url).toContain('paramount-completes');
    const proxy = applyOfficialRules(m({ url: 'https://ir.netflix.net/press-release-details/2026/proxy', domain: 'netflix.net', snippet: 'Netflix issued a statement regarding its definitive agreement with Warner Bros. Discovery, Inc. (WBD) to acquire Warner Bros., including HBO.', published_at: '2026-02-17T00:00:00Z' }), nw);
    expect(scoreMentions([netflix, proxy], now, nw).superseded).toBeNull();
  });
});
