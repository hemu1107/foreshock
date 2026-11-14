import { createContext, useContext, useState, useEffect, type ReactNode, type Context } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { Radar, Bookmark, BookOpen, ArrowUpRight, FlaskConical } from 'lucide-react';
import { sampleTraces, type Trace } from '@/mocks/sampleTraces';
import { useServerFn } from '@tanstack/react-start';
import { traceLive, recheckLive, advanceLive, readLive, listLive, watchLive } from '@/lib/live.functions';
import { traceWithPrecedentsSchema as liveTraceSchema, type LiveTrace } from '@/lib/live';
import { toast } from 'sonner';
import { isCachedCheck } from '@/lib/brief';

type Workspace = { traces: LiveTrace[]; sample: boolean; setSample: (v:boolean)=>void; toggleWatch:(id:string)=>Promise<void>; recheck:(id:string)=>Promise<void>; create:(input:{query:string;entities:string[];window_days:7|30|90})=>Promise<string>; load:(id:string)=>Promise<LiveTrace|null>; error:string; loading:boolean; reload:()=>void; isCached:(trace:LiveTrace)=>boolean };
// Reuse one context across hot reloads so the provider and pages never disagree.
const contextStore = globalThis as typeof globalThis & { __smokeWorkspaceContext?: Context<Workspace | null> };
const WorkspaceContext = contextStore.__smokeWorkspaceContext ??= createContext<Workspace | null>(null);
export function SmokeProvider({children}:{children:ReactNode}) {
  const [samples,setSamples] = useState(sampleTraces);
  const [live,setLive]=useState<LiveTrace[]>([]);
  const [sample,setSample] = useState(false);
  useEffect(()=>{if(new URLSearchParams(window.location.search).get('demo')==='1')setSample(true);},[]);
  const [error,setError]=useState(''),[loading,setLoading]=useState(false);
  const [reloadKey,setReloadKey]=useState(0),[freshChecks,setFreshChecks]=useState<Record<string,string>>({});
  const reload=()=>setReloadKey(n=>n+1);
  const isCached=(trace:LiveTrace)=>isCachedCheck(sample,trace.stage,trace.checked_at,freshChecks[trace.id]);
  const createFn=useServerFn(traceLive), recheckFn=useServerFn(recheckLive), advanceFn=useServerFn(advanceLive), readFn=useServerFn(readLive), listFn=useServerFn(listLive), watchFn=useServerFn(watchLive);
  const save=(t:LiveTrace)=>setLive(ts=>[t,...ts.filter(existing=>existing.id!==t.id)]);
  const load=async(id:string)=>{const raw=await readFn({data:{id}});if(!raw)return null;const t=liveTraceSchema.parse(raw);save(t);return t;};
  const drive=async(id:string)=>{
    // One bounded stage per awaited call. Database leases prevent duplicate processing across tabs.
    for(let remaining=20;remaining>0;remaining--){const t=await load(id);if(!t||['done','error'].includes(t.stage)){if(t?.stage==='done')setFreshChecks(checks=>({...checks,[id]:t.checked_at}));return;}await advanceFn({data:{id}});}
    const t=await load(id);if(t?.stage==='done')setFreshChecks(checks=>({...checks,[id]:t.checked_at}));
  };
  useEffect(()=>{if(sample)return;let active=true;setLoading(true);setError('');listFn().then(async rows=>{const results=await Promise.all(rows.map(r=>readFn({data:{id:r.id}})));if(active)setLive(results.filter(r=>r!==null).map(r=>liveTraceSchema.parse(r)));}).catch(()=>{if(active)setError('Could not load saved traces. Samples are still available.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[sample,reloadKey]);
  const create=async(input:{query:string;entities:string[];window_days:7|30|90})=>{const r=await createFn({data:input});await load(r.trace_id);void drive(r.trace_id).catch(()=>{setError('Processing was interrupted. Re-open the trace to check its saved progress.');});return r.trace_id;};
  const toggleWatch=async(id:string)=>{if(sample){setSamples(ts=>ts.map(t=>t.id===id?{...t,watching:!t.watching}:t));return;}const trace=live.find(t=>t.id===id);if(!trace)return;try{await watchFn({data:{id,watching:!trace.watching}});await load(id);}catch{toast.error('Could not save watch selection. Try again.');}};
  const recheck=async(id:string)=>{if(sample){setSamples(ts=>ts.map(t=>t.id===id?{...t,checked_at:new Date().toISOString()}:t));return;}const current=live.find(t=>t.id===id);if(!current||['done','error'].includes(current.stage))await recheckFn({data:{id}});await load(id);await drive(id);};
  return <WorkspaceContext.Provider value={{traces:sample?samples:live,sample,setSample,toggleWatch,recheck,create,load,error,loading,reload,isCached}}>{children}</WorkspaceContext.Provider>;
}
export function useWorkspace() { const value=useContext(WorkspaceContext); if(!value) throw new Error('Smoke workspace is missing'); return value; }
export function Navigation() {
  const {sample,traces}=useWorkspace();
  const path=useRouterState({select:s=>s.location.pathname});
  const [time,setTime]=useState('');
  useEffect(()=>{const tick=()=>setTime(new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',timeZoneName:'short'}));tick();const i=setInterval(tick,30000);return()=>clearInterval(i);},[]);
  return <header className="app-nav"><div className="nav-inner">
    <Link to="/" className="wordmark" aria-label="Smoke home"><span className="logo-dot"/>smoke</Link>
    <nav className="nav-links" aria-label="Main navigation">
      <Link to="/" aria-current={path==='/'||path.startsWith('/trace/')?'page':undefined} className={`nav-link ${path==='/'||path.startsWith('/trace/')?'active':''}`}><Radar/>Trace</Link>
      <Link to="/watchlist" aria-current={path==='/watchlist'?'page':undefined} className={`nav-link ${path==='/watchlist'?'active':''}`}><Bookmark/>Watchlist{traces.some(t=>t.watching)&&<span className="mono text-primary text-[13px]">{traces.filter(t=>t.watching).length}</span>}</Link>
      <Link to="/method" aria-current={path==='/method'?'page':undefined} className={`nav-link ${path==='/method'?'active':''}`}><BookOpen/>Method</Link>
    </nav>
    <div className="nav-right"><span className="data-time">Data as of {time||'—'}</span>{sample&&<span className="mono text-[13px] text-primary">DEMO DATA</span>}<span className="powered-by">Powered by <span className="font-semibold text-foreground">You.com</span></span></div>
  </div></header>;
}
export function Footer({sources,live=false}:{sources?:number;live?:boolean}) { return <footer className="site-footer"><span>{sources ? live ? `Retrieved ${sources} sources via You.com Search, Contents and Research` : `${sources} fictional sample sources · No live retrieval performed` : 'Find the smoke before the fire.'}</span><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span>Built at Ground Truth NYC</span><span aria-hidden>·</span><span>Live web by You.com</span><span aria-hidden>·</span><span>Ledger by OpenCrawl</span><span aria-hidden>·</span><Link to="/method" className="flex items-center gap-1">Methodology<ArrowUpRight/></Link></div></footer>; }
export function SampleNotice() { return <div className="notice"><FlaskConical/><span>Fictional sample. Companies and reports are illustrative; source links open outlet homepages.</span></div>; }