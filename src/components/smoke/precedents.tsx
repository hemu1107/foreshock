import { ArrowUpRight } from 'lucide-react';
import { precedentStatus, precedentSummary, type Precedent } from '@/lib/precedents';
import { statusClass } from './evidence';

export function Precedents({ rows, outlet }: { rows: Precedent[]; outlet?: string | undefined }) {
  if (!rows.length) return null;
  const summary = precedentSummary(rows, outlet);
  return <section className="ledger-section" aria-labelledby="ledger-title">
    <div className="eyebrow mb-2">Precedents</div>
    <h2 id="ledger-title">From the Fourshock ledger</h2>
    <p className="mt-3">{summary.confirmed} of {summary.total} similar past rumors were confirmed</p>
    {summary.outlet && <p className="meta mt-1">{summary.outlet.name}: {summary.outlet.confirmed} of {summary.outlet.total} confirmed</p>}
    <ul className="ledger-cases">{rows.map(row => <li key={row.document_id}>
      <span className={`status-badge ${statusClass(precedentStatus(row.outcome))}`}><span className="status-dot"/>{row.outcome}</span>
      <h3>{row.case_title}</h3>
      {/\.md$/i.test(row.document_id) && <p className="mono meta mt-1">{row.document_id}</p>}
      <p className="meta mt-1">{[row.outlet, row.sourcing].filter(Boolean).join(' · ')}</p>
      {row.resolved && row.days_to_resolution !== null && <p className="mono meta mt-2">resolved in {row.days_to_resolution} days</p>}
      {row.resolution_source && <a className="inline-flex items-center gap-1 text-[14px] mt-2" href={row.resolution_source} target="_blank" rel="noreferrer">Resolution source<ArrowUpRight/></a>}
    </li>)}</ul>
    <p className="mono meta mt-4">Indexed by OpenCrawl</p>
  </section>;
}
