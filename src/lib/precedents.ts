import { z } from 'zod';
import type { Status } from './scoring';
import { publicUrl } from './pipeline';

export const precedentSchema = z.object({
  document_id: z.string(), case_title: z.string(), outlet: z.string(),
  first_reported_at: z.string().nullable(), sourcing: z.string(), deal_type: z.string(),
  outcome: z.string(), resolved: z.boolean(), days_to_resolution: z.number().int().nonnegative().nullable(),
  resolution_source: z.string().nullable(),
});
export type Precedent = z.infer<typeof precedentSchema>;
export const ledgerSearchArgs = (query: string) => ({ query, source: 'connectors' as const, match: 'any' as const, limit: 8 });
export function precedentQueries(claim: string, entities: string[], outlet?: string) {
  const deal = /layoff|workforce/i.test(claim) ? 'layoffs' : /fund|round|rais/i.test(claim) ? 'funding' : /launch|release/i.test(claim) ? 'launch' : /ceo|executive/i.test(claim) ? 'executive move' : 'acquisition';
  const company = entities[0] || claim.split(/\s+(?:in talks|to acquire|buys|acquires|reportedly|may|plans)\b/i)[0] || '';
  return [...new Set([outlet ? `${outlet} ${deal}` : '', `${company} ${deal}`, `${deal} anonymous sources`].filter(Boolean).map(q => q.trim().split(/\s+/).slice(0, 6).join(' ')))].slice(0, 3);
}
export function parseCase(markdown: string, documentId: string): Precedent | null {
  const title = markdown.match(/^#\s+Case:\s*(.+)$/mi)?.[1]?.trim();
  if (!title) return null;
  const field = (key: string) => {
    const line = markdown.split('\n').find(line => new RegExp(`^\\s*(?:[-*]\\s*)?(?:\\*\\*)?${key}(?:\\*\\*)?\\s*:`, 'i').test(line));
    return line?.replace(new RegExp(`^\\s*(?:[-*]\\s*)?(?:\\*\\*)?${key}(?:\\*\\*)?\\s*:\\s*(?:\\*\\*)?`, 'i'), '').trim().replace(/^["']|["']$/g, '') ?? '';
  };
  const outcome = field('outcome');
  if (!outcome) return null;
  const days = field('days_to_resolution');
  const source = field('resolution_source');
  const url = source.match(/\]\((https?:\/\/[^\s)]+)\)/)?.[1] ?? source;
  return { document_id: documentId, case_title: title, outlet: field('first_reported_by'),
    first_reported_at: field('date') || null, sourcing: field('sourcing'), deal_type: field('deal_type'),
    outcome, resolved: /^(true|yes|1)$/i.test(field('resolved')),
    days_to_resolution: /^\d+$/.test(days) ? Number(days) : null,
    resolution_source: publicUrl(url) ? url : null };
}
export function precedentStatus(outcome: string): Status {
  switch (outcome.trim().toLowerCase()) {
    case 'confirmed': return 'Confirmed';
    case 'denied': return 'Denied';
    case 'went cold': case 'went_cold': return 'Went cold';
    case 'corroborated': return 'Corroborated';
    case 'rumor': return 'Rumor';
    default: return 'Whisper';
  }
}
export function precedentSummary(rows: Precedent[], outlet?: string) {
  const tally = (cases: Precedent[]) => ({ confirmed: cases.filter(c => c.outcome.trim().toLowerCase() === 'confirmed').length, total: cases.length });
  const matching = outlet ? rows.filter(c => c.outlet.trim().toLowerCase() === outlet.trim().toLowerCase()) : [];
  return { ...tally(rows), outlet: matching.length ? { name: outlet, ...tally(matching) } : null };
}