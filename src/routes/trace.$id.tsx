import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Bookmark, RefreshCw, Download, ChevronLeft, AlertTriangle, MessageSquareQuote } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Footer, SampleNotice, useWorkspace } from '@/components/smoke/workspace';
import { StatusBadge, StatusLadder, KpiTile, OriginCard, SpreadMap, EvidenceTable, VerdictCard, SummaryLead, CachedBadge, dateLabel, relative, StepTracker } from '@/components/smoke/evidence';
import { scoreMentions } from '@/lib/scoring';
import { dealParties } from '@/lib/official';
import { stageIndex } from '@/lib/live';
import { exportMarkdownBrief } from '@/lib/brief';
import { WorkspaceState } from '@/components/smoke/state';
import { SAMPLE_NOW, sampleTraces } from '@/mocks/sampleTraces';
import { SignalStack } from '@/components/smoke/signals';
import { Precedents } from '@/components/smoke/precedents';

export const Route = createFileRoute('/trace/$id')({
  head:({params})=>{const t=sampleTraces.find(t=>t.id===params.id);const title=t?`${t.entities.join(' / ')} — Foreshock trace`:'Live rumor trace — Foreshock';const description=t?`Fictional sample: ${t.claim}. View origin, independent evidence and rumor status.`:'Explore the origin, spread and independent evidence of this live rumor trace in Foreshock.';return {meta:[{title},{name:'description',content:description},{property:'og:title',content:title},{property:'og:description',content:description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]};},
  component:TraceResult,
});
function TraceResult() {
  const {id}=Route.useParams(); const {traces,toggleWatch,recheck,sample,load,isCached}=useWorkspace();const trace=traces.find(t=>t.id===id);
  const [checking,setChecking]=useState(false),[loadError,setLoadError]=useState(''),[fetching,setFetching]=useState(!sample),[retry,setRetry]=useState(0),[watching,setWatching]=useState(false);
  useEffect(()=>{if(sample){setFetching(false);setLoadError('');return;}let active=true;setFetching(true);setLoadError('');const poll=async()=>{try{await load(id);if(active)setLoadError('');}catch{if(active)setLoadError('Could not load this trace. Your saved evidence has not been changed.');}finally{if(active)setFetching(false);}};void poll();const timer=setInterval(()=>{if(!trace||!['done','error'].includes(trace.stage))void poll();},1500);return()=>{active=false;clearInterval(timer);};},[id,sample,trace?.stage,retry]);
  if(!trace)return <div className="page"><WorkspaceState kind={loadError?'error':fetching?'loading':'empty'} title={loadError?'Trace unavailable':fetching?'Loading saved trace':'Trace not found'} description={loadError|| (fetching?'Retrieving the last saved evidence and assessment.':sample?'This trace is not in the fictional sample workspace.':'This trace could not be found in saved evidence.')}>
    {loadError&&<Button variant="outline" onClick={()=>setRetry(n=>n+1)}><RefreshCw/>Try again</Button>}
    <Button asChild><Link to="/">Back to Trace</Link></Button>
  </WorkspaceState></div>;
  const score=scoreMentions(trace.mentions,sample?SAMPLE_NOW:new Date(trace.checked_at),sample?[]:dealParties(trace.claim,trace.entities));const origin=trace.mentions.find(m=>m.is_origin)??trace.mentions[0];
  const running=checking||!['done','error'].includes(trace.stage);
  const refresh=async()=>{setChecking(true);try{await recheck(id);toast.success(sample?'Sample re-checked. Evidence unchanged.':'Live trace re-checked.');}catch(e){toast.error(e instanceof Error?e.message:'Could not re-check this trace.');}finally{setChecking(false);}};
  const exportBrief=()=>{const brief=exportMarkdownBrief(trace,sample,new Date());const url=URL.createObjectURL(new Blob([brief],{type:'text/markdown;charset=utf-8'}));const anchor=document.createElement('a');anchor.href=url;anchor.download=`foreshock-brief-${trace.id}.md`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast.success('Markdown brief exported.');};
  const watch=async()=>{setWatching(true);try{await toggleWatch(id);}finally{setWatching(false);}};
  return <div className="page trace-result reveal-page"><div className="flex justify-between items-center gap-4"><Link to="/" className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-primary"><ChevronLeft/>All traces</Link><span className="mono text-[13px] text-muted-foreground flex items-center gap-2">{sample?'SAMPLE INTELLIGENCE':'LIVE WEB EVIDENCE'} {isCached(trace)&&<CachedBadge/>}</span></div>{sample&&<SampleNotice/>}
    <section className="band"><div className="result-top"><div><div className="eyebrow">TRACE · <span className="eyebrow-id">{id}</span> · <span className="eyebrow-checked">CHECKED {relative(trace.checked_at,sample?SAMPLE_NOW:new Date()).toUpperCase()}</span></div><h1 className="result-heading">{trace.claim}</h1><div className="entity-row">{trace.entities.map(e=><span className="entity-chip" key={e}>{e}</span>)}</div><SummaryLead trace={trace}/></div>
      <aside className="status-card">
        {running?<div className="skeleton h-9 w-32"/>:<><StatusBadge status={trace.status} large/>{score.superseded&&<a className="trace-chip trace-chip-warning" href={score.superseded.url} target="_blank" rel="noreferrer" title={score.superseded.title}><AlertTriangle aria-hidden/>Later superseded</a>}{trace.analyst_note&&<span className="trace-chip" aria-label={`Analyst note: ${trace.analyst_note.status}. ${trace.analyst_note.reason}`} title={trace.analyst_note.reason}><MessageSquareQuote aria-hidden/><span className="whitespace-nowrap">Analyst note: {trace.analyst_note.status}</span><span className="trace-chip-reason"> · {trace.analyst_note.reason}</span></span>}</>}
        <div className="status-card-metrics"><div><span className="metric-label">Status confidence</span>{running?<span className="skeleton skeleton-num"/>:<span className="metric-value">{trace.confidence}<span className="unit">%</span></span>}</div><div><span className="metric-label">Evidence score</span>{running?<span className="skeleton skeleton-num"/>:<><span className="metric-value">{trace.smoke_score}<span className="unit"> / 100</span></span><svg viewBox="0 0 100 3" className="score-track" aria-label={`Evidence Score ${trace.smoke_score} out of 100`} preserveAspectRatio="none"><rect width="100" height="3" fill="var(--border)"/><rect className="score-fill" width={trace.smoke_score} height="3" fill="var(--primary)"/></svg></>}</div></div>
        <div className="quiet-actions"><Button variant="ghost" size="sm" onClick={refresh} disabled={checking||trace.paused}><RefreshCw/>{checking?'Checking…':!['done','error'].includes(trace.stage)?'Resume trace':'Re-check now'}</Button><Button variant={trace.watching?'secondary':'ghost'} size="sm" onClick={watch} disabled={watching} aria-pressed={trace.watching}><Bookmark/>{trace.watching?'Watching':'Watch'}</Button><Button variant="ghost" size="sm" onClick={exportBrief}><Download/>Export brief</Button></div>
      </aside></div>
    {running&&<StepTracker stage={stageIndex(trace.stage)} sample={sample}/>} {loadError&&<WorkspaceState kind="error" title="Saved evidence shown" description={loadError}><Button variant="outline" size="sm" onClick={()=>setRetry(n=>n+1)}>Retry loading</Button></WorkspaceState>}{trace.error&&<WorkspaceState kind="error" title={trace.paused?'Trace paused':'Trace interrupted'} description={trace.error}>{trace.paused?<Button variant="outline" asChild><Link to="/">Back to Trace</Link></Button>:<Button variant="outline" size="sm" onClick={refresh} disabled={checking}>Retry trace</Button>}</WorkspaceState>}<StatusLadder status={trace.status}/><div className="kpi-row"><KpiTile label="Mentions found" count={trace.mentions.length} note="Across the search window"/><KpiTile label="Independent sources" count={score.independent} note="Distinct reporting domains"/><KpiTile label="Echoes" count={score.echoes} note="Not independent corroboration"/><KpiTile label="First seen" value={<span>{dateLabel(origin?.published_at??null)}</span>} note={origin?.outlet??'Not identified'}/><KpiTile label="Latest movement" value={<span>{relative(trace.mentions.at(-1)?.published_at??trace.checked_at,sample?SAMPLE_NOW:new Date(trace.checked_at))}</span>} note={trace.mentions.at(-1)?.outlet??'—'}/></div></section>
    <section className="band"><SignalStack mentions={trace.mentions} now={sample?SAMPLE_NOW:new Date(trace.checked_at)}/>{origin&&<OriginCard mention={origin}/>}{!running&&<><SpreadMap mentions={trace.mentions} now={sample?SAMPLE_NOW:new Date(trace.checked_at)}/><div className="evidence-layout"><EvidenceTable mentions={trace.mentions}/><div className="evidence-aside"><VerdictCard trace={trace}/></div></div></>}</section>
    {!sample&&(trace.precedents?.length??0)>0&&<section className="band"><Precedents rows={trace.precedents??[]} outlet={origin?.outlet}/></section>}
    <Footer sources={trace.mentions.length} live={!sample}/>
  </div>;
}
