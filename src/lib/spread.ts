import type { Mention } from './scoring';

export type SpreadNode = { id: string; members: Mention[]; x: number; y: number; row: number };
export function layoutSpread(mentions: Mention[], now: Date) {
  const dated = mentions.filter(m => m.published_at && Number.isFinite(Date.parse(m.published_at)));
  const times = dated.map(m => Date.parse(m.published_at ?? ''));
  const min = times.length ? Math.min(...times) : now.getTime();
  const max = Math.max(now.getTime(), ...times);
  const row = (m: Mention) => m.is_origin ? 0 : m.sourcing === 'social' ? 4 : ['official statement', 'filing'].includes(m.sourcing) ? 3 : m.sourcing === 'cites outlet' ? 2 : 1;
  const nodes: SpreadNode[] = [];
  const groups = new Map<string, SpreadNode>();
  for (const m of [...dated].sort((a,b) => (a.published_at ?? '').localeCompare(b.published_at ?? '') || a.id.localeCompare(b.id))) {
    const r = row(m), x = 128 + (Date.parse(m.published_at ?? '') - min) / (max - min || 1) * 970;
    // Echoes within the same timeline bucket and attribution are one counted marker.
    const key = `${Math.floor((x - 128) / 36)}:${m.attributes_to ?? 'unknown'}:${m.stance}`;
    const group = r === 2 ? groups.get(key) : undefined;
    if (group) { group.members.push(m); continue; }
    const node = { id: m.id, members: [m], x, y: 45 + r * 64, row: r };
    if (r === 2) groups.set(key, node);
    nodes.push(node);
  }
  // Deterministic five-lane jitter; extra dense points spread horizontally too.
  for (let r = 0; r < 5; r++) {
    const placed: SpreadNode[] = [];
    for (const node of nodes.filter(n => n.row === r)) {
      const base = 45 + r * 64;
      let assigned = false;
      for (let offset = 0; offset <= 992 && !assigned; offset += 16) {
        for (const lane of [0, -1, 1, -2, 2]) {
          const direction = node.x > 623 ? -1 : 1;
          const x = Math.max(128, Math.min(1118, node.x + offset * direction));
          const y = base + lane * 12;
          if (placed.every(p => Math.hypot(p.x - x, p.y - y) >= 14)) {
            node.x = x; node.y = y; assigned = true; break;
          }
        }
      }
      placed.push(node);
    }
  }
  return { nodes, min, max, undated: mentions.length - dated.length };
}