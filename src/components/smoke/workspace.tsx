import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { Radar, Bookmark, BookOpen, ArrowUpRight, FlaskConical } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { sampleTraces, type Trace } from '@/mocks/sampleTraces';

type Workspace = { traces: Trace[]; sample: boolean; setSample: (v:boolean)=>void; toggleWatch:(id:string)=>void; recheck:(id:string)=>void };
const WorkspaceContext = createContext<Workspace | null>(null);
export function SmokeProvider({children}:{children:ReactNode}) {
  const [traces,setTraces] = useState(sampleTraces);
  const [sample,setSample] = useState(true);
  const toggleWatch = (id:string) => setTraces(ts=>ts.map(t=>t.id===id?{...t,watching:!t.watching}:t));
  const recheck = (id:string) => setTraces(ts=>ts.map(t=>t.id===id?{...t,checked_at:new Date().toISOString()}:t));
  return <WorkspaceContext.Provider value={{traces,sample,setSample,toggleWatch,recheck}}>{children}</WorkspaceContext.Provider>;
}
export function useWorkspace() { const value=useContext(WorkspaceContext); if(!value) throw new Error('Smoke workspace is missing'); return value; }
export function Navigation() {
  const {sample,setSample,traces}=useWorkspace();
  const path=useRouterState({select:s=>s.location.pathname});
  const [time,setTime]=useState('17:02');
  useEffect(()=>{setTime(new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false}));},[]);
  return <header className="app-nav"><div className="nav-inner">
    <Link to="/" className="wordmark" aria-label="Smoke home"><span className="logo-dot"/>smoke</Link>
    <nav className="nav-links" aria-label="Main navigation">
      <Link to="/" className={`nav-link ${path==='/'||path.startsWith('/trace/')?'active':''}`}><Radar/>Trace</Link>
      <Link to="/watchlist" className={`nav-link ${path==='/watchlist'?'active':''}`}><Bookmark/>Watchlist{traces.some(t=>t.watching)&&<span className="mono text-primary text-[10px]">{traces.filter(t=>t.watching).length}</span>}</Link>
      <Link to="/method" className={`nav-link ${path==='/method'?'active':''}`}><BookOpen/>Method</Link>
    </nav>
    <div className="nav-right"><span className="mono text-[10px] text-muted-foreground data-time">Data as of {time}</span><label className="flex items-center gap-2 text-[10px] text-muted-foreground"><Switch checked={sample} onCheckedChange={setSample} aria-label="Sample data"/>Sample data</label><span className="powered-by text-[10px] text-muted-foreground">Powered by <span className="font-semibold text-foreground">You.com</span></span></div>
  </div></header>;
}
export function Footer({sources}:{sources?:number}) { return <footer className="site-footer"><span>{sources ? `${sources} fictional sample sources · No live retrieval performed` : 'Find the smoke before the fire.'}</span><div className="flex items-center gap-5"><span className="mono">SMOKE INTELLIGENCE</span><Link to="/method" className="flex items-center gap-1">Our methodology<ArrowUpRight/></Link></div></footer>; }
export function SampleNotice() { return <div className="notice"><FlaskConical/><span>Fictional sample. Companies and reports are illustrative; source links open outlet homepages.</span></div>; }