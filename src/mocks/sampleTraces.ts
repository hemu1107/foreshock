import { isIndependent, scoreMentions, type Mention, type Status } from '@/lib/scoring';

export const SAMPLE_NOW = new Date('2026-11-14T17:02:00Z');
export interface Trace {
  id: string; query: string; claim: string; entities: string[]; window_days: number;
  stage: string; status: Status; confidence: number; smoke_score: number;
  summary_md: string; confirm_signals: string[]; kill_signals: string[]; watch_signals: string[];
  origin_mention_id: string; watching: boolean; created_at: string; checked_at: string;
  mentions: Mention[]; history: { status: Status; reason: string; at: string }[];
}
function mention(id: number, day: number, outlet: string, domain: string, sourcing: Mention['sourcing'], stance: Mention['stance'], title: string, extra: Partial<Mention> = {}): Mention {
  const m: Mention = { id: `m-${id}`, url: `https://${domain}/`, title, domain, outlet,
    published_at: `2026-11-${String(day).padStart(2, '0')}T${String(8 + id % 10).padStart(2,'0')}:30:00Z`,
    snippet: 'FICTIONAL SAMPLE — This illustrative mention is not a real report. The source link opens the outlet homepage, not an article supporting this claim.',
    attribution_quotes: [], stance, sourcing, attributes_to: null, is_origin: id === 1,
    is_independent: false, paywalled: false, mainstream: true, source_api: 'you_search', ...extra };
  m.is_independent = isIndependent(m); return m;
}
const acquisition = [
  mention(1,5,'Bloomberg','bloomberg.com','anonymous source','reports','Northwind Robotics weighs $1.2 billion deal for Helix Vision',{ paywalled:true, attribution_quotes:['people familiar with the matter'] }),
  mention(2,6,'Reuters','reuters.com','anonymous source','reports','Northwind and Helix hold acquisition discussions, sources say',{ attribution_quotes:['two people with direct knowledge of the talks'] }),
  ...[['CNBC','cnbc.com'],['TechCrunch','techcrunch.com'],['Financial Times','ft.com'],['The Verge','theverge.com'],['Axios','axios.com'],['Business Insider','businessinsider.com'],['Fortune','fortune.com'],['Yahoo Finance','yahoo.com'],['MarketWatch','marketwatch.com']].map(([o='Outlet',d='example.com'],i) => mention(i+3,6+Math.floor(i*.8),o,d,'cites outlet','repeats',`${o}: Northwind reportedly explores Helix Vision acquisition`,{attributes_to:'bloomberg.com', attribution_quotes:['according to Bloomberg']})),
  mention(12,13,'Northwind Robotics','northwind.example','official statement','unrelated','Northwind declines to comment on market speculation',{involved_party:true}),
  mention(13,13,'X','x.com','social','reports','Robotics community discusses a potential Northwind–Helix tie-up',{mainstream:false}),
  mention(14,14,'Reddit','reddit.com','social','repeats','What a Helix acquisition could mean for computer vision',{mainstream:false}),
];
const denied = [
  mention(1,8,'TechCrunch','techcrunch.com','anonymous source','reports','Aster Labs reportedly preparing a 20% workforce reduction'),
  mention(2,9,'Business Insider','businessinsider.com','cites outlet','repeats','Aster Labs layoffs could affect one in five staff',{attributes_to:'techcrunch.com'}),
  mention(3,9,'X','x.com','social','repeats','Speculation grows around Aster Labs headcount',{mainstream:false}),
  mention(4,10,'Aster Labs','aster.example','official statement','denies','Aster Labs: no workforce reduction is planned',{involved_party:true, attribution_quotes:['We are not planning layoffs. Our hiring plan remains unchanged.']}),
  mention(5,10,'Reuters','reuters.com','cites outlet','repeats','Aster Labs denies reports of planned layoffs',{attributes_to:'aster.example'}),
];
function makeTrace(id:string, claim:string, entities:string[], mentions:Mention[], confidence:number, summary:string):Trace {
  const score = scoreMentions(mentions,SAMPLE_NOW);
  return { id, query:claim, claim, entities, window_days:30, stage:'done', status:score.status, confidence, smoke_score:score.smokeScore, summary_md:summary,
    confirm_signals:['A signed acquisition agreement or regulatory filing.','An on-record announcement from either company.'],
    kill_signals:['An explicit denial from an involved party.','Verified reporting that negotiations have ended.'],
    watch_signals:['Company newsroom and regulatory filings','New independently sourced reporting','Changes to the reported deal value'],
    origin_mention_id:'m-1', watching:false, created_at:'2026-11-14T16:45:00Z', checked_at:'2026-11-14T17:00:00Z', mentions,
    history:[{status:'Rumor',reason:'First independently sourced report.',at:'2026-11-05T09:30:00Z'},{status:score.status,reason:score.status==='Denied'?'Official company denial.':'A second outlet reports with its own sources.',at:'2026-11-14T17:00:00Z'}] };
}
export const sampleTraces: Trace[] = [
  makeTrace('8f2a9c41','Northwind Robotics in talks to acquire Helix Vision for about $1.2B',['Northwind Robotics','Helix Vision'],acquisition,86,'Two independent outlets report acquisition discussions, citing their own anonymous sources. Nine subsequent articles echo the original Bloomberg report and do not add corroboration. Neither company has confirmed a transaction; a refusal to comment is not confirmation. The evidence supports that talks may be taking place, not that a deal has been agreed.'),
  {...makeTrace('d4c7b208','Aster Labs planning to lay off 20% of its workforce',['Aster Labs'],denied,97,'Aster Labs explicitly denied the reported workforce reduction in an official statement. The original report relied on anonymous sourcing; subsequent coverage mostly repeated it. No later official confirmation is present. The current evidence supports a Denied status, not a claim that layoffs are happening.'), confirm_signals:['A later official announcement confirming layoffs.','A verified workforce filing.'],watch_signals:['Any revision to the official statement','Subsequent workforce filings']},
];