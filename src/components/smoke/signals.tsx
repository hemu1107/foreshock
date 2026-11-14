import { aggregateSignals, signalLabels, signalOrder } from '@/lib/signals';
import type { Mention } from '@/lib/scoring';
import { CountUp } from './motion';

export function SignalStack({ mentions, now }: { mentions: Mention[]; now: Date }) {
  const { counts, total, volume, trend } = aggregateSignals(mentions, now);
  const peak = Math.max(1, ...volume), top = Math.max(1, ...Object.values(counts));
  return <section className="signal-stack" aria-labelledby="signal-title">
    <div className="signal-head">
      <div><h2 id="signal-title">Signal stack</h2><p>{total} weak signals assembled into one picture. None counts alone; together they show how much is really there.</p></div>
      <div className={`signal-trend trend-${trend}`}><span className="pulse" aria-hidden="true"/>Signal {trend}</div>
    </div>
    <div className="signal-grid">
      <ul className="signal-bars">{signalOrder.map((k, i) => <li key={k} style={{ ['--i' as string]: i }}>
        <div className="signal-row"><span>{signalLabels[k].label}</span><span className="mono"><CountUp value={counts[k]}/></span></div>
        <div className="signal-track"><span className={`signal-fill fill-${k}`} style={{ width: `${(counts[k] / top) * 100}%` }}/></div>
        <p>{signalLabels[k].note}</p>
      </li>)}</ul>
      <figure className="signal-volume"><figcaption>Mentions per week, last 8 weeks</figcaption>
        <div className="volume-bars" role="img" aria-label={`Weekly mentions: ${volume.join(', ')}`}>{volume.map((v, i) => <span key={i} style={{ height: `${Math.max(4, (v / peak) * 100)}%`, ['--i' as string]: i }} title={`${v} mentions`}/>)}</div>
        <div className="volume-axis mono"><span>8w ago</span><span>this week</span></div>
      </figure>
    </div>
  </section>;
}
