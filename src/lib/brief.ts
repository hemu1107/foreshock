import type { Trace } from '@/mocks/sampleTraces';
import { isIndependent, scoreMentions } from './scoring';
import { registrableDomain } from './domains';

export function isCachedCheck(sample: boolean, stage: string, checkedAt: string, freshCheckedAt?: string) {
  return !sample && stage === 'done' && checkedAt !== freshCheckedAt;
}

export function briefSources(trace: Trace) {
  // Keep evidence order stable so the on-screen verdict and export share numbering.
  return trace.mentions.map((mention, index) => ({ mention, number: index + 1 }));
}

export function numberedVerdict(trace: Trace) {
  return numberCitations(trace.summary_md, trace);
}

export function numberCitations(text: string, trace: Trace) {
  let summary = text;
  for (const { mention, number } of briefSources(trace)) {
    summary = summary.split(`](${mention.url})`).join(`][${number}]`);
    summary = summary.split(`<${mention.url}>`).join(`[${number}]`);
    summary = summary.replaceAll(mention.url, `[${number}]`);
  }
  return summary;
}

export function exportMarkdownBrief(trace: Trace, sample: boolean, exportedAt: Date) {
  const sources = briefSources(trace);
  const score = scoreMentions(trace.mentions, new Date(trace.checked_at));
  const origin = sources.find(s => s.mention.is_origin);
  const domains = new Set<string>();
  const independent = sources.filter(({ mention }) => {
    if (!isIndependent(mention)) return false;
    const domain = registrableDomain(mention.domain);
    if (domains.has(domain)) return false;
    domains.add(domain); return true;
  });
  const sourceLine = ({ mention: m, number }: (typeof sources)[number]) => `- [${number}] **${m.outlet}** — ${m.title}\n  ${m.published_at ?? 'Publication date unavailable'} · ${m.sourcing}\n  <${m.url}>`;
  const signals = (items: string[]) => items.length ? items.map(s => `- ${numberCitations(s, trace)}`).join('\n') : '- Not available from the current evidence.';
  const research = sources.filter(s => s.mention.source_api === 'you_research');
  return [
    '# Fourshock intelligence brief',
    sample ? '> FICTIONAL SAMPLE — not real intelligence. Links open outlet homepages.' : '> Rumor intelligence — the claim is not an established fact.',
    `## Claim\n${trace.claim}`,
    `## Assessment\n- **Status:** ${trace.status}\n- **Confidence in assigned status:** ${trace.confidence}% (not the probability the claim is true)\n- **Evidence Score:** ${trace.smoke_score}/100\n- **Independent sources:** ${score.independent}\n- **Echo count:** ${score.echoes}\n- **Last checked:** ${trace.checked_at}`,
    `## Origin\n${origin ? sourceLine(origin) : 'No origin has been identified.'}`,
    `## Independent sources\n${independent.length ? independent.map(sourceLine).join('\n') : 'No independent sources have been identified.'}`,
    `## Analyst verdict\n${numberedVerdict(trace) || 'No analyst verdict is available yet.'}${research.length ? '\n\nResearch sources: '+research.map(s=>`[${s.number}]`).join(', ') : ''}`,
    `## Confirm signals\n${signals(trace.confirm_signals)}`,
    `## Kill signals\n${signals(trace.kill_signals)}`,
    `## Watch signals\n${signals(trace.watch_signals)}`,
    `## Numbered sources\n${sources.length ? sources.map(sourceLine).join('\n\n') : 'No source evidence is available.'}`,
    ...sources.map(({ mention, number }) => `[${number}]: ${mention.url}`),
    `---\nExported: ${exportedAt.toISOString()} (UTC)\nTrace: ${trace.id}`,
  ].join('\n\n') + '\n';
}