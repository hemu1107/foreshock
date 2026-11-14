import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import Markdown from 'react-markdown';
import { ArrowUpRight, ArrowRight, ChevronDown, ChevronUp, Check, X, Eye, LockKeyhole, ExternalLink, Play } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { statusRules, type Status, type Mention } from '@/lib/scoring';
import { SAMPLE_NOW, type Trace } from '@/mocks/sampleTraces';
import { layoutSpread, spreadTime, type SpreadNode } from '@/lib/spread';
import { briefSources, numberedVerdict, numberCitations } from '@/lib/brief';
import { WorkspaceState } from './state';
import { CountUp, prefersReducedMotion } from './motion';
import { SignalMark } from './SignalMark';

export const dateLabel=(date:string|null)=>date?new Date(date).toLocaleDateString('en-US',{month:'short',day:'2-digit',timeZone:'UTC'}):'Undated';
export function relative(date:string,now:Date=SAMPLE_NOW) { const h=Math.max(0,Math.floor((now.getTime()-new Date(date).getTime())/3600000)); return h<1?'just now':h<24?`${h}h ago`:`${Math.floor(h/24)}d ago`; }
export const statusClass=(status:Status)=>`status-${status.toLowerCase().replace(' ','-')}`;
export function StatusBadge({status,large=false}:{status:Status;large?:boolean}) { return <span className={`status-badge ${statusClass(status)} ${large?'is-large':''}`}><span className="status-dot"/>{status}</span>; }

export function StatusLadder({status}:{status:Status}) {
  const main:Status[]=['Whisper','Rumor','Corroborated','Confirmed'];
  const reached=main.indexOf(status);
  return <div className="status-ladder" aria-label="Status ladder">
    {main.map((s,i)=><div key={s} className="flex items-center gap-3">
      <span title={statusRules[s]} className={`ladder-step ${statusClass(s)} ${i<=reached?'filled':''} ${s===status?'current':''}`}><span className="ladder-dot"/>{s}</span>
      {i<3&&<span className={`ladder-link ${i<reached?'filled':''}`} style={{['--i' as string]:i}} aria-hidden="true"/>}
    </div>)}
    <span className="mx-3 text-border">|</span>
    {(['Denied','Went cold'] as Status[]).map(s=><span key={s} title={statusRules[s]} className={`ladder-step ${statusClass(s)} ${s===status?'filled current':''}`}><span className="ladder-dot"/>{s}</span>)}
  </div>;
}

export function KpiTile({label,value,note,count}:{label:string;value?:React.ReactNode;note:string;count?:number}) {
  return <div className="kpi"><div>{label}</div><div className={`kpi-value${count===undefined?' is-text':''}`}>{count!==undefined?<CountUp value={count}/>:value}</div><div className="kpi-note">{note}</div></div>;
}

export function SourceLink({mention}:{mention:Mention}) { return <a href={mention.url} target="_blank" rel="noreferrer" title={mention.outlet} className="flex items-center gap-2"><span className="outlet-mark" aria-hidden="true">{mention.outlet[0]}</span><span className="mono text-[13px]">{mention.domain}</span><ArrowUpRight className="text-muted-foreground shrink-0"/></a>; }

export function OriginCard({mention}:{mention:Mention}) { return <section className="origin-section"><div><div className="origin-label">Earliest traceable report</div><div className="flex items-center gap-2"><span className="outlet-mark">{mention.outlet[0]}</span><span className="font-medium text-[15px]">{mention.outlet}</span></div><div className="mono text-[13px] text-muted-foreground mt-2">{mention.published_at?new Date(mention.published_at).toISOString().replace('T',' · ').slice(0,24)+' UTC':'Date unavailable'}</div></div><div><a href={mention.url} target="_blank" rel="noreferrer" className="font-medium text-[16px] inline-flex gap-2 items-center hover:text-primary">{mention.title}<ArrowUpRight/></a><div className="flex flex-wrap gap-2 mt-3">{mention.attribution_quotes.map(q=><span className="entity-chip" key={q}>“{q}”</span>)}{mention.paywalled&&<span className="entity-chip gap-1"><LockKeyhole/>Paywalled</span>}</div><p className="text-[14px] text-muted-foreground mt-3 leading-relaxed">{mention.snippet.slice(0,240)}</p></div></section>; }

const rows=['Origin','Independent','Echo','Official','Social'];
export function CachedBadge() { return <span className="cached-badge" title="Saved evidence from the last completed check">Cached</span>; }

export function SpreadMap({mentions,now=SAMPLE_NOW}:{mentions:Mention[];now?:Date}) {
  const [hover,setHover]=useState<SpreadNode|null>(null),[selected,setSelected]=useState<SpreadNode|null>(null);
  const [cursor,setCursor]=useState<number|null>(null),[playing,setPlaying]=useState(false);
  const raf=useRef(0);
  const {nodes,min,max,undated}=layoutSpread(mentions,now);
  const origin=nodes.find(n=>n.members.some(m=>m.is_origin));
  const timeOf=(n:SpreadNode)=>spreadTime(n,min,max);
  useEffect(()=>()=>cancelAnimationFrame(raf.current),[]);
  const replay=()=>{
    if(playing||!nodes.length)return;
    if(prefersReducedMotion()){setCursor(null);return;}
    setPlaying(true);setSelected(null);
    const start=performance.now();
    const step=(t:number)=>{const p=Math.min(1,(t-start)/3000);setCursor(min+(max-min)*p);if(p<1){raf.current=requestAnimationFrame(step);}else{setCursor(null);setPlaying(false);}};
    raf.current=requestAnimationFrame(step);
  };
  const visible=cursor===null?nodes:nodes.filter(n=>timeOf(n)<=cursor);
  if(!nodes.length)return <section className="spread-section"><h2 className="section-title">Spread map</h2><WorkspaceState title="No dated evidence yet" description={mentions.length?'Publication dates are unavailable. Source details remain in the evidence list.':'No mentions have been retrieved for this trace.'}/></section>;
  const cx=cursor===null?null:128+((cursor-min)/(max-min||1))*970;
  return <section className="spread-section"><div className="section-heading"><h2 className="flex items-center gap-3">Spread map<span className="mono text-[13px] text-muted-foreground font-normal">{mentions.length} mentions / {Math.ceil((max-min)/86400000)} days{undated?` · ${undated} undated`:''}</span></h2><div className="flex flex-wrap items-center gap-4 text-[13px] text-muted-foreground"><span className="flex items-center gap-2"><span className="status-dot text-primary"/>Reports / repeats</span><span className="flex items-center gap-2"><span className="status-dot text-denied"/>Denies</span><span className="flex items-center gap-2"><span className="status-dot text-whisper"/>Social</span><Button variant="outline" size="sm" onClick={replay} disabled={playing} className="ml-1"><Play/>{playing?'Replaying…':'Replay'}</Button></div></div>
  <div className="overflow-x-auto"><svg viewBox="0 0 1160 365" className={`spread-svg${playing?' replay-running':''}`} role="group" aria-label="Source spread timeline">
    {Array.from({length:5},(_,i)=><g key={i}><line x1={128+i*242.5} x2={128+i*242.5} y1="16" y2="333" className="grid-line"/><text x={128+i*242.5} y="354" textAnchor="middle">{dateLabel(new Date(min+(max-min)*i/4).toISOString())}</text></g>)}
    {rows.map((r,i)=><g key={r}><text x="0" y={49+i*64}>{r}</text><line x1="128" x2="1118" y1={45+i*64} y2={45+i*64} className="grid-line"/></g>)}
    {visible.filter(n=>n.members[0]?.attributes_to).map(n=>{const m=n.members[0];const attributed=nodes.find(s=>s.members.some(source=>source.domain===m?.attributes_to))??origin;return attributed?<path key={`line-${n.id}`} d={`M ${attributed.x} ${attributed.y} C ${n.x} ${attributed.y}, ${attributed.x} ${n.y}, ${n.x} ${n.y}`} pathLength={1} className={`echo-line${playing?' echo-draw':''}`}/>:null;})}
    {visible.map(n=>{const m=n.members[0];if(!m)return null;const clustered=n.members.length>1;return <g key={n.id} role="button" tabIndex={0} aria-label={clustered?`${n.members.length} echoes attributed to ${m.attributes_to??'unknown source'}`:`${m.outlet}: ${m.title}`} aria-pressed={selected?.id===n.id} className="spread-marker" onMouseEnter={()=>setHover(n)} onMouseLeave={()=>setHover(null)} onFocus={()=>setHover(n)} onBlur={()=>setHover(null)} onClick={()=>setSelected(selected?.id===n.id?null:n)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(selected?.id===n.id?null:n);}if(e.key==='Escape')setSelected(null);}}>
      <circle cx={n.x} cy={n.y} r="22" className="marker-hit"/>
      <circle cx={n.x} cy={n.y} r={clustered?11:m.is_origin?7:6} className={`dot ${m.stance==='denies'?'dot-denied':m.sourcing==='social'?'dot-social':['official statement','filing'].includes(m.sourcing)?'dot-official':''} ${clustered?'dot-cluster':''}`}/>
      {clustered&&<text x={n.x} y={n.y+4} textAnchor="middle" className="cluster-count">{n.members.length}</text>}
      <title>{clustered?`${n.members.length} echoes · ${m.attributes_to}`:`${m.outlet} · ${dateLabel(m.published_at)} · ${m.title}`}</title>
    </g>;})}
    {cx!==null&&<g aria-hidden="true"><line x1={cx} x2={cx} y1="16" y2="333" className="replay-cursor"/><text x={Math.min(1040,Math.max(120,cx))} y="10" textAnchor="middle" className="replay-date">{dateLabel(new Date(cursor as number).toISOString())}</text></g>}
  </svg></div><div className="spread-caption" aria-live="polite">{hover?<><strong>{hover.members.length>1?`${hover.members.length} echoes`:hover.members[0]?.outlet}</strong> · {dateLabel(hover.members[0]?.published_at??null)} · {hover.members[0]?.title}</>:<span>{nodes.filter(n=>n.members.length>1).length} echo clusters · {undated} undated mentions</span>}</div>
  {selected&&<div className="cluster-details"><div className="section-heading"><h3 className="card-title">{selected.members.length>1?`${selected.members.length} echoed reports`:'Source details'}</h3><Button variant="ghost" size="icon" aria-label="Close source details" onClick={()=>setSelected(null)}><X/></Button></div><ul>{selected.members.map(m=><li key={m.id}><a href={m.url} target="_blank" rel="noreferrer"><span className="mono text-muted-foreground">{dateLabel(m.published_at)} · {m.outlet}</span><span>{m.title}<ArrowUpRight/></span></a></li>)}</ul></div>}
  </section>;
}

export function EvidenceTable({mentions}:{mentions:Mention[]}) {
  const [stance,setStance]=useState('all'),[sourcing,setSourcing]=useState('all'),[ascending,setAscending]=useState(true),[expanded,setExpanded]=useState<string|null>(null),[search,setSearch]=useState('');
  const filtered=mentions.filter(m=>`${m.title} ${m.outlet} ${m.snippet}`.toLowerCase().includes(search.toLowerCase())&&(stance==='all'||m.stance===stance)&&(sourcing==='all'||m.sourcing===sourcing)).sort((a,b)=>(ascending?1:-1)*((a.published_at??'').localeCompare(b.published_at??'')));
  return <section><div className="section-heading mb-4"><h2 className="section-title">Evidence <span className="mono text-[15px] text-muted-foreground font-normal ml-2">{filtered.length}</span></h2><span className="meta">All times UTC</span></div><div className="search-field evidence-search"><Search aria-hidden="true"/><Input aria-label="Search evidence" placeholder="Search headlines, outlets or source text" value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="flex flex-wrap gap-1 mb-3">{['all','reports','repeats','confirms','denies','unrelated'].map(s=><Button key={s} size="sm" variant="ghost" className={`filter-button ${stance===s?'selected':''}`} aria-pressed={stance===s} onClick={()=>setStance(s)}>{s==='all'?'All stances':s.charAt(0).toUpperCase()+s.slice(1)}</Button>)}</div><select value={sourcing} onChange={e=>setSourcing(e.target.value)} className="native-select text-[13px] mb-4" aria-label="Filter sourcing"><option value="all">All sourcing</option>{['original reporting','cites outlet','named source','anonymous source','official statement','filing','social'].map(s=><option key={s}>{s}</option>)}</select>
  <div className="table-frame"><table className="data-table evidence-table"><thead><tr><th scope="col" className="col-date" aria-sort={ascending?'ascending':'descending'}><Button variant="ghost" size="sm" className="filter-button px-0" onClick={()=>setAscending(v=>!v)}>Date{ascending?<ChevronDown/>:<ChevronUp/>}</Button></th><th scope="col" className="col-outlet">Outlet</th><th scope="col">Headline</th><th scope="col" className="col-tags">Stance / sourcing</th><th scope="col" className="col-attrs">Attributes to</th><th scope="col" className="col-snippet"><span className="sr-only">Snippet</span></th></tr></thead><tbody>{filtered.map(m=><EvidenceRow key={m.id} mention={m} expanded={expanded===m.id} onExpand={()=>setExpanded(expanded===m.id?null:m.id)}/>)}{!filtered.length&&<tr><td colSpan={6} className="text-center text-muted-foreground"><WorkspaceState title={mentions.length?"No matching sources":"No source evidence yet"} description={mentions.length?"No mentions match this stance and sourcing combination.":"The trace has not produced source evidence."}>{mentions.length>0&&<Button variant="outline" size="sm" onClick={()=>{setStance('all');setSourcing('all');setSearch('');}}>Clear filters</Button>}</WorkspaceState></td></tr>}</tbody></table></div></section>;
}

function EvidenceRow({mention:m,expanded,onExpand}:{mention:Mention;expanded:boolean;onExpand:()=>void}) {
  return <><tr><td className="mono whitespace-nowrap">{dateLabel(m.published_at)}</td><td className="cell-outlet"><SourceLink mention={m}/></td><td><a href={m.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="source-title block hover:text-primary" title={m.title}>{m.title}</a></td><td><span className="pill-row"><span className={`pill pill-stance${m.stance==='denies'?' pill-denies':''} capitalize`}>{m.stance}</span><span className="pill">{m.sourcing}</span></span></td><td className="mono text-muted-foreground">{m.attributes_to??'—'}</td><td><Button variant="ghost" size="sm" className="snippet-toggle filter-button px-0 text-muted-foreground" aria-expanded={expanded} onClick={e=>{e.stopPropagation();onExpand();}}>{expanded?'Hide snippet':'View snippet'}{expanded?<ChevronUp/>:<ChevronDown/>}</Button></td></tr>{expanded&&<tr className="snippet-row"><td colSpan={6}><div className="snippet-body"><p className="leading-relaxed text-[14px]">{m.snippet}</p>{m.attribution_quotes.map(q=><p key={q} className="mt-2 text-muted-foreground text-[14px]">“{q}”</p>)}</div></td></tr>}</>;
}

/** Analyst summary, shown under the claim. Same text, three lines until opened. */
export function SummaryLead({trace}:{trace:Trace}) {
  const [open,setOpen]=useState(false);
  const sources=briefSources(trace);
  const body=numberedVerdict(trace)+'\n\n'+sources.map(({mention,number})=>`[${number}]: ${mention.url}`).join('\n');
  const md=()=><Markdown components={{a:({href,children})=><a href={href} target="_blank" rel="noreferrer">{children}</a>}}>{body}</Markdown>;
  return <div className="summary-lead">
    {trace.summary_md?<div className={open?'':'summary-clamp'}>{md()}</div>:<p className="text-muted-foreground serif-body text-[19px] leading-snug">{trace.stage==='done'?'No analyst assessment is available. The status follows the collected evidence rules.':'Assessment pending. Source evidence is still being gathered.'}</p>}
    {trace.summary_md&&<Button variant="ghost" size="sm" className="summary-more" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?'Read less':'Read more'}</Button>}
  </div>;
}

export function VerdictCard({trace}:{trace:Trace}) { const sources=briefSources(trace);return <aside className="verdict"><h2 className="mb-4 flex items-center justify-between">Analyst verdict<span className="mono text-[13px] text-muted-foreground font-normal">{trace.confidence}% confidence</span></h2><div className="verdict-sources">{sources.filter(({mention})=>mention.source_api==='you_research').map(({mention:m,number})=><a key={m.id} href={m.url} target="_blank" rel="noreferrer" title={m.title}>[{number}] {m.outlet}</a>)}</div>{[{title:'What would confirm it',items:trace.confirm_signals,Icon:Check},{title:'What would kill it',items:trace.kill_signals,Icon:X},{title:'Watch for',items:trace.watch_signals,Icon:Eye}].map(({title,items,Icon})=><div key={title} className="mt-6"><h3 className="text-[15px] font-semibold mb-3">{title}</h3>{items.length?<ul className="flex flex-col gap-3">{items.map(item=><li key={item} className="flex items-start gap-2 text-[14px] text-muted-foreground leading-relaxed"><Icon className="shrink-0 mt-1"/><span className="min-w-0 flex-1"><Markdown components={{a:({href,children})=><a href={href} target="_blank" rel="noreferrer">{children}</a>}}>{numberCitations(item,trace)+'\n\n'+sources.map(({mention,number})=>`[${number}]: ${mention.url}`).join('\n')}</Markdown></span></li>)}</ul>:<p className="text-muted-foreground text-[14px]">No signals identified in the current assessment.</p>}</div>)}<LinkMethod/></aside>; }
function LinkMethod(){return <Link to="/method" className="flex items-center gap-1 text-[13px] text-muted-foreground mt-6 hover:text-primary">How this verdict is scored<ExternalLink/></Link>;}

export function StepTracker({stage,sample=true}:{stage:number;sample?:boolean}) { const steps=['Searching the live web','Reading sources','Classifying sourcing','Finding origin','Scoring']; return <div role="status" aria-live="polite" aria-busy="true"><div className="stage-tracker">{steps.map((s,i)=><div className={`stage-step ${i<stage?'done':i===stage?'active':''}`} style={{animationDelay:`${i*60}ms`}} key={s}>{i<stage?<Check/>:<span className="mono text-[13px]">{i+1}</span>}{s}</div>)}</div><p className="text-[13px] text-muted-foreground mt-2 flex items-center gap-2"><SignalMark size={18} active/><span>{sample?'Sample replay — no web requests are made.':'Tracing dated evidence across the live web…'}</span></p><div className="grid grid-cols-3 gap-4 mt-4" aria-hidden="true"><div className="skeleton h-16"/><div className="skeleton h-16"/><div className="skeleton h-16"/></div></div>; }
