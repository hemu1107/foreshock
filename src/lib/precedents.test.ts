import { afterEach, describe, expect, it, vi } from 'vitest';
import { ledgerSearchArgs, parseCase, precedentQueries, precedentSummary } from './precedents';
import { opencrawlPrecedents, OPENCRAWL_TIMEOUT } from './opencrawl.server';

const markdown = '# Case: Example acquisition\nfirst_reported_by: Bloomberg\ndate: 2025-01-10\nsourcing: anonymous sources\ndeal_type: acquisition\noutcome: confirmed\nresolved: true\ndays_to_resolution: 12\nresolution_source: [Filing](https://example.com/filing)';
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
describe('OpenCrawl ledger rules', () => {
  it('always restricts searches to connector documents with eight results', () => {
    expect(ledgerSearchArgs('Bloomberg acquisition')).toEqual({query:'Bloomberg acquisition',source:'connectors',match:'any',limit:8});
  });
  it('builds three short outlet, company and anonymous-source queries', () => {
    expect(precedentQueries('Acme buys Beta',['Acme','Beta'],'Bloomberg')).toEqual(['Bloomberg acquisition','Acme acquisition','acquisition anonymous sources']);
  });
  it('parses all supplied markdown case fields', () => {
    expect(parseCase(markdown,'case-1')).toEqual({document_id:'case-1',case_title:'Example acquisition',outlet:'Bloomberg',first_reported_at:'2025-01-10',sourcing:'anonymous sources',deal_type:'acquisition',outcome:'confirmed',resolved:true,days_to_resolution:12,resolution_source:'https://example.com/filing'});
  });
  it('counts confirmed outcomes and origin-outlet matches from the actual rows', () => {
    const row=parseCase(markdown,'one'); if(!row)throw new Error('Missing fixture');
    expect(precedentSummary([row,{...row,document_id:'two',outcome:'denied'},{...row,document_id:'three',outlet:'Reuters'}],'Bloomberg')).toEqual({confirmed:2,total:3,outlet:{name:'Bloomberg',confirmed:1,total:2}});
  });
  it('rejects unsafe resolution links without discarding the case', () => {
    expect(parseCase(markdown.replace('[Filing](https://example.com/filing)','javascript:alert(1)'),'one')?.resolution_source).toBeNull();
  });
  it('deduplicates documents and fetches no more than four cases in a session', async () => {
    vi.stubEnv('OPENCRAWL_API_KEY','test-only');
    const calls: {method:string;params?:{name:string;arguments:Record<string,unknown>}}[]=[];
    vi.stubGlobal('fetch',vi.fn(async (_url:unknown,init:RequestInit) => {
      const body=JSON.parse(String(init.body));calls.push(body);
      if(body.method==='initialize')return new Response(JSON.stringify({id:1,result:{}}),{headers:{'mcp-session-id':'test-session'}});
      expect(new Headers(init.headers).get('Mcp-Session-Id')).toBe('test-session');
      if(body.method==='notifications/initialized')return new Response(null,{status:202});
      const content=body.params.name==='search'?{results:Array.from({length:8},(_,i)=>({id:`case-${i}`}))}:{markdown};
      return new Response(`event: message\ndata: ${JSON.stringify({id:body.id,result:{structuredContent:content}})}\n\n`);
    }));
    expect(await opencrawlPrecedents(['Bloomberg acquisition','Acme acquisition','acquisition anonymous sources'])).toHaveLength(4);
    expect(calls.filter(c=>c.params?.name==='fetch')).toHaveLength(4);
    expect(calls.filter(c=>c.params?.name==='search').every(c=>c.params?.arguments['source']==='connectors')).toBe(true);
  });
  it('returns no cases on provider errors rather than failing the trace', async () => {
    vi.stubEnv('OPENCRAWL_API_KEY','test-only');vi.stubGlobal('fetch',vi.fn(async()=>new Response(null,{status:503})));
    expect(await opencrawlPrecedents(['Acme acquisition'])).toEqual([]);
  });
  it('bounds the entire operation to eight seconds, including a stuck response', async () => {
    vi.useFakeTimers();vi.stubEnv('OPENCRAWL_API_KEY','test-only');vi.stubGlobal('fetch',vi.fn(()=>new Promise(()=>{})));
    const pending=opencrawlPrecedents(['Acme acquisition']);
    expect(OPENCRAWL_TIMEOUT).toBe(8000);
    await vi.advanceTimersByTimeAsync(8000);
    expect(await pending).toEqual([]);
  });
  it('saves no cases from empty search results', async () => {
    vi.stubEnv('OPENCRAWL_API_KEY','test-only');
    vi.stubGlobal('fetch',vi.fn(async(_url:unknown,init:RequestInit)=>{
      const body=JSON.parse(String(init.body));
      return body.method==='notifications/initialized'?new Response(null,{status:202}):new Response(JSON.stringify({id:body.id,result:body.method==='initialize'?{}:{structuredContent:{results:[]}}}));
    }));
    expect(await opencrawlPrecedents(['Acme acquisition'])).toEqual([]);
  });
});