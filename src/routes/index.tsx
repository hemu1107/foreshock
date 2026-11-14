import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Plus, ChevronDown, ChevronUp, ArrowUpRight, Clock3, Radar, GitBranch, ShieldCheck } from 'lucide-react';
import { FEATURED_CLAIMS, featuredTrace, claimType, evidenceLabel, bottomLine, isRealTrace } from '@/lib/featured';
import { Button } from '@/components/ui/button';
import { Footer, useWorkspace } from '@/components/smoke/workspace';
import { StatusBadge, CachedBadge, dateLabel, StepTracker } from '@/components/smoke/evidence';
import { WorkspaceState } from '@/components/smoke/state';
import { TraceLibrary } from '@/components/smoke/trace-library';
import { Input } from '@/components/ui/input';
import { traceRumor } from '@/lib/api';

export const Route = createFileRoute('/')({
  head:()=>({meta:[{title:'Fourshock — Weak-signal intelligence'},{name:'description',content:'Aggregate weak signals from business and tech rumors. Weigh chatter, independent reporting and official evidence with Fourshock.'},{property:'og:title',content:'Fourshock — Weak-signal intelligence'},{property:'og:description',content:'See the signals before the shock. Evidence-first rumor tracing.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
  component:TraceHome,
});
function TraceHome() {
  const {traces:allTraces,sample,create,error:workspaceError,loading,reload,isCached}=useWorkspace();
  const traces=sample?allTraces:allTraces.filter(isRealTrace);
  const navigate=useNavigate();
  const [queryText,setQuery]=useState(''),[context,setContext]=useState(false),[windowDays,setWindowDays]=useState(30),[companyA,setCompanyA]=useState(''),[companyB,setCompanyB]=useState(''),[stage,setStage]=useState<number|null>(null),[error,setError]=useState('');
  const input=useRef<HTMLTextAreaElement>(null);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  const updateQuery=(v:string)=>{setQuery(v);setError('');if(input.current){input.current.style.height='auto';input.current.style.height=`${Math.max(104,input.current.scrollHeight)}px`;}};
  const submit=async(override?:string)=>{
    const query=override??queryText;
    if(!query.trim()){setError('Enter a rumor or choose an example to start.');input.current?.focus();return;}
    if(!sample){setError('');setStage(0);try {const id=await create({query,entities:[companyA,companyB].filter(Boolean),window_days:windowDays===7?7:windowDays===90?90:30});await navigate({to:'/trace/$id',params:{id}});}catch(e){setError(e instanceof Error?e.message:'Could not start this trace.');}finally{setStage(null);}return;}
    const result=traceRumor({query,window_days:windowDays,companyA,companyB});
    if(!result){setError('This demo includes Northwind–Helix acquisition talks and Aster Labs layoffs. Choose a sample below.');return;}
    setError('');setStage(0);
    const next=(i:number)=>{timer.current=setTimeout(()=>{if(i===5){setStage(null);navigate({to:'/trace/$id',params:{id:result.id}});}else{setStage(i);next(i+1);}},350);};next(1);
  };
  return <div className="page trace-home reveal-page"><div className="workspace-heading"><span>Fourshock / Weak-signal intelligence</span><span className="workspace-mode"><span className="status-dot"/>{sample?'Sample workspace':'Live evidence'}</span></div>
    <section className="band"><h1 className="home-heading">One whisper is noise.<br/><span>Forty is a signal.</span></h1>
    <p className="home-subtitle">Fourshock gathers scattered chatter, anonymous reports, echoes and filings about a business rumor, and stacks them into one picture of how strong it really is.</p>
    <form className="rumor-form" onSubmit={e=>{e.preventDefault();submit();}}><div className="trace-input"><label className="input-label" htmlFor="rumor-query"><Radar aria-hidden="true"/>What are you hearing?</label><textarea id="rumor-query" ref={input} aria-label="Rumor, headline or article URL" aria-invalid={Boolean(error)} aria-describedby={error?'trace-input-error':undefined} className="rumor-textarea" placeholder="Paste a rumor, headline or article link…" value={queryText} onChange={e=>updateQuery(e.target.value)} disabled={stage!==null}/>
      {context&&<div id="trace-context" className="px-5 pb-4 grid sm:grid-cols-2 gap-3"><Input aria-label="Company A" value={companyA} onChange={e=>setCompanyA(e.target.value)} placeholder="Company A" className="border border-input bg-background rounded-md p-2 outline-none focus:border-primary"/><Input aria-label="Company B" value={companyB} onChange={e=>setCompanyB(e.target.value)} placeholder="Company B (optional)" className="border border-input bg-background rounded-md p-2 outline-none focus:border-primary"/></div>}
      <div className="input-toolbar"><Button type="button" variant="ghost" size="sm" onClick={()=>setContext(v=>!v)} aria-expanded={context} aria-controls="trace-context" className="text-muted-foreground"><Plus/>Add context{context?<ChevronUp/>:<ChevronDown/>}</Button><div className="flex items-center gap-3"><label className="text-[13px] text-muted-foreground hidden sm:block" htmlFor="window">Time window</label><select id="window" aria-label="Time window" className="native-select" value={windowDays} onChange={e=>setWindowDays(Number(e.target.value))}>{[7,30,90].map(n=><option key={n} value={n}>Last {n} days</option>)}</select><Button type="submit" disabled={stage!==null} className="trace-submit">{stage===null?'Trace rumor':'Tracing…'}<ArrowRight/></Button></div></div></div></form>
    <div className="examples"><span className="examples-label">Trace a real claim</span>{FEATURED_CLAIMS.map(e=><Button key={e} variant="outline" size="sm" className="example-chip" disabled={stage!==null} onClick={()=>{updateQuery(e);void submit(e);}}>{e}<ArrowUpRight/></Button>)}</div>
    {error&&<div role="alert" className="notice mt-4"><span id="trace-input-error">{error}</span><Button variant="ghost" size="sm" onClick={()=>submit()}>Retry</Button>{traces[0]&&<Button variant="link" size="sm" asChild><Link to="/trace/$id" params={{id:traces[0].id}}>Show last result</Link></Button>}</div>}
    {stage!==null&&<StepTracker stage={stage} sample={sample}/>}</section>
    {!sample&&<section className="band featured-section" aria-labelledby="featured-heading"><div className="section-heading"><h2 id="featured-heading">Featured traces</h2><span className="meta">Latest saved checks</span></div><div className="featured-grid">{FEATURED_CLAIMS.map(c=>{const t=featuredTrace(c,traces);const o=t&&(t.mentions.find(m=>m.is_origin)??t.mentions[0]);return t?<Link key={c} to="/trace/$id" params={{id:t.id}} className="featured-trace"><div className="featured-topline"><span>Saved signal stack</span><ArrowUpRight aria-hidden="true"/></div><h3 className="featured-claim">{t.claim}</h3><div className="featured-tags"><StatusBadge status={t.status}/><span className="entity-chip">{claimType(t.claim)}</span><span className="meta">{evidenceLabel(t.smoke_score)}</span></div><div className="featured-origin mono">{isCached(t)&&<CachedBadge/>}{o?`${o.outlet} · ${dateLabel(o.published_at)}`:'Origin not identified'}</div><p className="featured-bottom">{bottomLine(t.summary_md)}</p></Link>:<div key={c} className="featured-trace featured-empty"><div className="text-[16px] font-medium">{c}</div><p className="featured-bottom">{loading?'Loading saved trace…':'No saved trace yet. Use the example above to run one.'}</p></div>;})}</div></section>}
    <section className="band recent-section"><div className="section-heading"><h2 className="flex items-center gap-2"><Clock3 className="text-muted-foreground"/>Recent traces <span className="mono text-[15px] text-muted-foreground font-normal ml-1">{traces.length}</span></h2><span className="meta">{sample?'Demo data':'Live web evidence'}</span></div>
    {workspaceError&&<WorkspaceState kind="error" title="Saved traces unavailable" description={workspaceError}><Button variant="outline" onClick={reload}>Try again</Button></WorkspaceState>}{(!workspaceError||traces.length>0)&&(traces.length?<TraceLibrary traces={traces} sample={sample} isCached={isCached}/>:<WorkspaceState kind={loading?'loading':'empty'} title={loading?'Loading saved traces':'No live traces yet'} description={loading?'Retrieving saved claims and evidence.':'No saved claims in this workspace.'}>{!loading&&<Button variant="outline" onClick={()=>input.current?.focus()}>Trace a rumor<ArrowRight/></Button>}</WorkspaceState>)}</section>
    <section className="band" aria-labelledby="how-heading"><div className="section-heading"><h2 id="how-heading">How it works</h2><span className="meta">Example: Samsung–Modine</span></div><ol className="grid gap-8 md:grid-cols-3">{[['Collect every weak signal','115 mentions of Samsung–Modine across blogs, wires, filings and social.'],['Weigh them, don’t count them','36 echoes of one Bloomberg scoop add up to one source, not 36.'],['See where it’s heading','Signal building or fading, week by week, with every mention linked.']].map(([h,p],i)=>{const Icon=[Radar,GitBranch,ShieldCheck][i]??Radar;return <li key={h} className="border-t border-border pt-4"><div className="method-step-heading"><Icon aria-hidden="true"/><span className="mono text-primary text-[15px]">{i+1}</span></div><h3 className="card-title mt-3">{h}</h3><p className="meta mt-2">{p}</p></li>;})}</ol><p className="meta mt-8">Live web by You.com · Ledger by OpenCrawl</p></section><Footer/>
  </div>;
}
