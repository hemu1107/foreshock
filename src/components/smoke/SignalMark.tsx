const BARS = [
  { x: 2,  h: 10, color: '#4FB0A4', delay: 0.0,  dur: 1.1 },
  { x: 8,  h: 18, color: '#4FB0A4', delay: 0.25, dur: 0.9 },
  { x: 14, h: 24, color: '#E2724A', delay: 0.1,  dur: 0.7 },
  { x: 20, h: 18, color: '#4FB0A4', delay: 0.4,  dur: 1.0 },
  { x: 26, h: 10, color: '#4FB0A4', delay: 0.15, dur: 1.2 },
];

export function SignalMark({ size = 18, active = true }: { size?: number; active?: boolean }) {
  return (
    <svg width={size * (30 / 28)} height={size} viewBox="0 0 30 28" aria-hidden="true" className="signal-mark">
      <style>{`
        .signal-mark rect { transform-box: fill-box; transform-origin: center; }
        .signal-mark .on rect { animation: sm-pulse var(--d) ease-in-out var(--delay) infinite alternate; }
        @keyframes sm-pulse { 0% { transform: scaleY(.35) } 45% { transform: scaleY(1) } 70% { transform: scaleY(.6) } 100% { transform: scaleY(.9) } }
        @media (prefers-reduced-motion: reduce) { .signal-mark .on rect { animation: none; } }
      `}</style>
      <g className={active ? 'on' : ''}>
        {BARS.map((b, i) => (
          <rect key={i} x={b.x} y={(28 - b.h) / 2} width="3" height={b.h} rx="1.5" fill={b.color}
            style={{ ['--d' as string]: `${b.dur}s`, ['--delay' as string]: `${-b.delay}s` }} />
        ))}
      </g>
    </svg>
  );
}
