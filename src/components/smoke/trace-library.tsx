import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Search, ArrowUpRight, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge, CachedBadge, dateLabel, relative } from './evidence';
import { WorkspaceState } from './state';
import { claimType, evidenceLabel } from '@/lib/featured';
import { scoreMentions } from '@/lib/scoring';
import { SAMPLE_NOW } from '@/mocks/sampleTraces';
import type { LiveTrace } from '@/lib/live';

export function TraceLibrary({ traces, sample, isCached }: { traces: LiveTrace[]; sample: boolean; isCached: (trace: LiveTrace) => boolean }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [order, setOrder] = useState('newest');
  const visible = traces.filter(t => `${t.claim} ${t.entities.join(' ')}`.toLowerCase().includes(search.toLowerCase()) && (status === 'all' || t.status === status))
    .sort((a, b) => order === 'evidence' ? b.smoke_score - a.smoke_score : b.checked_at.localeCompare(a.checked_at));
  const clear = () => { setSearch(''); setStatus('all'); setOrder('newest'); };
  return <>
    <div className="library-toolbar">
      <div className="search-field"><Search aria-hidden="true"/><Input aria-label="Search saved traces" placeholder="Search claims or companies" value={search} onChange={e => setSearch(e.target.value)}/></div>
      <div className="library-selects"><SlidersHorizontal aria-hidden="true" className="text-muted-foreground"/><select className="native-select" aria-label="Filter traces by status" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option>{['Whisper','Rumor','Corroborated','Confirmed','Denied','Went cold'].map(s => <option key={s}>{s}</option>)}</select><select className="native-select" aria-label="Sort saved traces" value={order} onChange={e => setOrder(e.target.value)}><option value="newest">Latest checked</option><option value="evidence">Strongest evidence</option></select></div>
    </div>
    <p className="library-count mono" role="status">{visible.length} of {traces.length} saved traces</p>
    {!visible.length ? <WorkspaceState title="No matching traces" description="No saved claims match this search and status."><Button variant="outline" onClick={clear}>Clear filters</Button></WorkspaceState> : <div className="table-frame trace-library"><table className="data-table"><caption className="sr-only">Saved rumor traces and their evidence assessments</caption><thead><tr>{['Claim','Status','Type','Evidence','Origin','Last checked'].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{visible.map(t => {
      const score = scoreMentions(t.mentions, sample ? SAMPLE_NOW : new Date(t.checked_at));
      const origin = t.mentions.find(m => m.is_origin) ?? t.mentions[0];
      return <tr key={t.id}><td data-label="Claim"><Link to="/trace/$id" params={{id:t.id}} className="claim-link">{t.claim}<ArrowUpRight aria-hidden="true"/></Link><div className="claim-meta">{isCached(t) && <CachedBadge/>}<span>{t.entities.join(' · ')}</span></div></td><td data-label="Status">{t.stage === 'done' ? <StatusBadge status={t.status}/> : <span className="mono text-muted-foreground">{t.stage}</span>}</td><td data-label="Type"><span className="entity-chip">{claimType(t.claim)}</span></td><td data-label="Evidence"><span className="evidence-strength">{evidenceLabel(t.smoke_score)}</span><span className="cell-secondary mono">{score.independent} independent · {score.echoes} echoes</span></td><td data-label="Origin"><span>{origin?.outlet ?? 'Not identified'}</span><span className="cell-secondary mono">{dateLabel(origin?.published_at ?? null)}</span></td><td data-label="Last checked"><time dateTime={t.checked_at} title={new Date(t.checked_at).toLocaleString()} className="mono text-muted-foreground">{relative(t.checked_at, sample ? SAMPLE_NOW : new Date())}</time></td></tr>;
    })}</tbody></table></div>}
  </>;
}