import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Plus, ChevronDown, ChevronUp, Radar, GitBranch, ShieldCheck, ArrowUpRight, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer, useWorkspace } from '@/components/smoke/workspace';
import { StatusBadge, dateLabel, StepTracker } from '@/components/smoke/evidence';
import { traceRumor } from '@/lib/api';
import { scoreMentions } from '@/lib/scoring';
import { SAMPLE_NOW, sampleTraces } from '@/mocks/sampleTraces';

export const Route = createFileRoute('/')({
  head:()=>({meta:[{title:'Smoke — Trace a rumor'},{name:'description',content:'Trace the origin of business and tech rumors. Separate independent reporting from echoes with Smoke.'},{property:'og:title',content:'Smoke — Trace a rumor'},{property:'og:description',content:'Find the smoke before the fire. Evidence-first rumor tracing.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
  component:TraceHome,
});
const examples=['Northwind’s $1.2B acquisition talks','Aster Labs workforce reduction','Helix Vision deal speculation'];
function TraceHome() {
  const {traces,sample,create,error:workspaceError,loading}=useWorkspace();
  const navigate=useNavigate();
  const [query,setQuery]=useState(''),[context,setContext]=useState(false),[windowDays,setWindowDays]=useState(30),[companyA,setCompanyA]=useState(''),[companyB,setCompanyB]=useState(''),[stage,setStage]=useState<number|null>(null),[error,setError]=useState('');
  const input=useRef<HTMLTextAreaElement>(null);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  const updateQuery=(v:string)=>{setQuery(v);setError('');if(input.current){input.current.style.height='auto';input.current.style.height=`${Math.max(126,input.current.scrollHeight)}px`;}};
  const submit=async()=>{
    if(!query.trim()){setError('Enter a rumor or choose an example to start.');input.current?.focus();return;}
    if(!sample){setError('');setStage(0);try {const id=await create({query,entities:[companyA,companyB].filter(Boolean),window_days:windowDays===7?7:windowDays===90?90:30});await navigate({to:'/trace/$id',params:{id}});}catch(e){setError(e instanceof Error?e.message:'Could not start this trace.');}finally{setStage(null);}return;}
    const result=traceRumor({query,window_days:windowDays,companyA,companyB});
    if(!result){setError('This demo includes Northwind–Helix acquisition talks and Aster Labs layoffs. Choose a sample below.');return;}
    setError('');setStage(0);
    const next=(i:number)=>{timer.current=setTimeout(()=>{if(i===5){setStage(null);navigate({to:'/trace/$id',params:{id:result.id}});}else{setStage(i);next(i+1);}},350);};next(1);
  };
  return <main className="page trace-home"><div className="flex items-center justify-between"><div className="eyebrow flex items-center gap-2"><span className="status-dot text-primary"/>THE SIGNAL. NOT THE NOISE.</div><span className="mono text-[10px] text-muted-foreground hidden sm:block">RUMOR-TRACING INTELLIGENCE</span></div>
    <h1 className="home-heading">Where did this rumor come from,<br className="hidden sm:block"/> and is it real?</h1>
    <p className="home-subtitle">Paste a rumor, headline or article URL. Smoke traces its origin, maps how it spread<br className="hidden lg:block"/> and shows what’s actually confirmed.</p>
    <form onSubmit={e=>{e.preventDefault();submit();}}><div className="trace-input"><textarea ref={input} aria-label="Rumor, headline or article URL" className="rumor-textarea" placeholder="What are you hearing? Paste a rumor, headline or link…" value={query} onChange={e=>updateQuery(e.target.value)} disabled={stage!==null}/>
      {context&&<div className="px-5 pb-4 grid sm:grid-cols-2 gap-3"><input aria-label="Company A" value={companyA} onChange={e=>setCompanyA(e.target.value)} placeholder="Company A" className="border border-input bg-background rounded-md p-2 outline-none focus:border-primary"/><input aria-label="Company B" value={companyB} onChange={e=>setCompanyB(e.target.value)} placeholder="Company B (optional)" className="border border-input bg-background rounded-md p-2 outline-none focus:border-primary"/></div>}
      <div className="input-toolbar"><Button type="button" variant="ghost" size="sm" onClick={()=>setContext(v=>!v)} aria-expanded={context} className="text-muted-foreground"><Plus/>Add context{context?<ChevronUp/>:<ChevronDown/>}</Button><div className="flex items-center gap-3"><label className="text-[11px] text-muted-foreground hidden sm:block" htmlFor="window">Time window</label><select id="window" aria-label="Time window" className="native-select text-xs" value={windowDays} onChange={e=>setWindowDays(Number(e.target.value))}>{[7,30,90].map(n=><option key={n} value={n}>Last {n} days</option>)}</select><Button type="submit" disabled={stage!==null} className="h-9 text-xs px-5">{stage===null?'Trace rumor':'Tracing…'}<ArrowRight/></Button></div></div></div></form>
    <div className="examples"><span className="text-[10px] text-muted-foreground mr-1">Try a sample</span>{examples.map((e,i)=><Button key={e} variant="outline" size="sm" className="example-chip h-7" onClick={()=>{const chosen=sampleTraces[i===1?1:0];if(chosen)updateQuery(chosen.claim);input.current?.focus();}}>{e}<ArrowUpRight/></Button>)}</div>
    {(error||workspaceError)&&<div role="alert" className="notice mt-4 flex-wrap"><span>{error||workspaceError}</span><Button variant="ghost" size="sm" onClick={submit}>Retry</Button>{traces[0]&&<Button variant="link" size="sm" asChild><Link to="/trace/$id" params={{id:traces[0].id}}>Show last result</Link></Button>}</div>}
    {stage!==null&&<StepTracker stage={stage}/>}
    <section className="recent-section"><div className="section-heading"><h2 className="flex items-center gap-2"><Clock3 className="text-muted-foreground"/>Recent traces <span className="mono text-[10px] text-muted-foreground font-normal ml-1">{String(traces.length).padStart(2,'0')}</span></h2><span className="mono text-[10px] text-muted-foreground">{sample?'FICTIONAL SAMPLE DATA':'LIVE WEB EVIDENCE'}</span></div>
    <div className="table-frame"><table className="data-table"><thead><tr><th className="w-[38%]">Claim</th><th>Status</th><th>Independent sources</th><th>Echoes</th><th>First seen</th><th>Last checked</th><th/></tr></thead><tbody>{traces.length?traces.map(t=>{const score=scoreMentions(t.mentions,sample?SAMPLE_NOW:new Date(t.checked_at));return <tr key={t.id}><td><Link to="/trace/$id" params={{id:t.id}} className="claim-link">{t.claim}</Link><div className="mono text-[9px] text-muted-foreground mt-2">{t.entities.join(' · ')}</div></td><td>{t.stage==='done'?<StatusBadge status={t.status}/>:<span className="mono text-[10px] text-muted-foreground">{t.stage}</span>}</td><td className="mono">{score.independent.toString().padStart(2,'0')}</td><td className="mono text-muted-foreground">{score.echoes.toString().padStart(2,'0')}</td><td className="mono text-[10px] whitespace-nowrap">{dateLabel(t.mentions[0]?.published_at??null)}<span className="text-muted-foreground block mt-1">{t.mentions[0]?.outlet??"—"}</span></td><td className="mono text-[10px] text-muted-foreground whitespace-nowrap">{t.checked_at==='2026-11-14T17:00:00Z'?'2m ago':'Just now'}</td><td><Button size="icon" variant="ghost" asChild><Link to="/trace/$id" params={{id:t.id}} aria-label={`Open ${t.entities[0]} trace`}><ArrowUpRight/></Link></Button></td></tr>;}):<tr><td colSpan={7} className="text-muted-foreground text-center">{loading?'Loading saved traces…':'No live traces yet. Start with a rumor above.'}</td></tr>}</tbody></table></div></section>
    <section className="home-bottom"><div><h3><Radar className="text-primary"/>Find the first report</h3><p>Follow a claim back to its earliest traceable source, not the loudest headline.</p></div><div><h3><GitBranch className="text-muted-foreground"/>Separate signal from echo</h3><p>Ten articles citing one report are still one source. Independent evidence matters.</p></div><div><h3><ShieldCheck className="text-muted-foreground"/>Know what’s actually confirmed</h3><p>A clear status, dated evidence, and the signals that could change the story.</p></div></section><Footer/>
  </main>;
}
