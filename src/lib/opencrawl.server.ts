import { ledgerSearchArgs, parseCase, type Precedent } from './precedents';

const endpoint = 'https://app.getopencrawl.com/mcp';
export const OPENCRAWL_TIMEOUT = 8000;

async function parseResponse(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error(`OpenCrawl request failed (${response.status}).`);
  const text = await response.text();
  if (!text.trim()) return null;
  if (!text.trimStart().startsWith('{') && !text.trimStart().startsWith('[')) {
    const events = text.split(/\r?\n\r?\n/).map(event => event.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')).filter(Boolean);
    for (const data of events) {
      try { const parsed: unknown = JSON.parse(data); if (record(parsed)?.['id'] !== undefined) return parsed; } catch { /* Ignore SSE heartbeat events. */ }
    }
    throw new Error('OpenCrawl returned no RPC result.');
  }
  return JSON.parse(text);
}
function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function toolContent(payload: unknown): unknown {
  const envelope = record(payload);
  if (envelope?.['error']) throw new Error('OpenCrawl RPC failed.');
  const result = record(envelope?.['result']);
  if (!result || result['isError']) throw new Error('OpenCrawl tool failed.');
  if (result['structuredContent'] !== undefined) return result['structuredContent'];
  const blocks = result['content'];
  const text = Array.isArray(blocks) ? blocks.map(block => record(block)?.['text']).filter((v): v is string => typeof v === 'string').join('\n') : '';
  if (!text) throw new Error('OpenCrawl returned no content.');
  try { return JSON.parse(text); } catch { return text; }
}
function searchDocuments(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(v => record(v) ? [record(v) as Record<string, unknown>] : []);
  const object = record(value);
  if (!object) return [];
  for (const key of ['results', 'documents', 'items', 'matches', 'data']) {
    if (object[key] !== undefined) return searchDocuments(object[key]);
  }
  return typeof object['id'] === 'string' ? [object] : [];
}
function caseMarkdown(value: unknown): string {
  if (typeof value === 'string') return value;
  const object = record(value);
  if (!object) return '';
  for (const key of ['markdown', 'text', 'content', 'document', 'data']) {
    const content = caseMarkdown(object[key]);
    if (content) return content;
  }
  return '';
}

// The session, document fetches and parsing share one deadline, not a timeout per request.
export async function opencrawlPrecedents(queries: string[]): Promise<Precedent[]> {
  const key = process.env['OPENCRAWL_API_KEY'];
  if (!key) { console.info('opencrawl_precedents', { outcome: 'not_configured' }); return []; }
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const work = async () => {
    const headers: Record<string, string> = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
    let id = 1;
    const post = (body: unknown) => fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
    const init = await post({ jsonrpc: '2.0', id: id++, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '1' } } });
    const sid = init.headers.get('mcp-session-id');
    const initialized = record(await parseResponse(init));
    if (initialized?.['error']) throw new Error('OpenCrawl initialization failed.');
    if (sid) headers['Mcp-Session-Id'] = sid;
    const notification = await post({ jsonrpc: '2.0', method: 'notifications/initialized' });
    if (!notification.ok) throw new Error('OpenCrawl session notification failed.');
    await notification.text();
    const call = async (name: string, args: unknown) => toolContent(await parseResponse(await post({ jsonrpc: '2.0', id: id++, method: 'tools/call', params: { name, arguments: args } })));
    const documents = new Map<string, Record<string, unknown>>();
    for (const query of queries.slice(0, 3)) {
      for (const doc of searchDocuments(await call('search', ledgerSearchArgs(query)))) {
        const docId = doc['id'];
        if (typeof docId === 'string' && !documents.has(docId)) documents.set(docId, doc);
      }
    }
    console.info('opencrawl_search', { queries: queries.slice(0, 3), source: 'connectors', results: documents.size });
    const raws = await Promise.all([...documents.keys()].slice(0, 4).map(async docId => ({ docId, markdown: caseMarkdown(await call('fetch', { id: docId })) })));
    const seen = new Set<string>();
    const cases = raws.map(r => parseCase(r.markdown, r.docId)).filter((c): c is Precedent => c !== null && !seen.has(c.case_title.toLowerCase()) && !!seen.add(c.case_title.toLowerCase()));
    console.info('opencrawl_cases', cases.map(c => ({ title: c.case_title, outlet: c.outlet, outcome: c.outcome, days: c.days_to_resolution })));
    if (raws.length && !cases.length) console.warn('opencrawl_parse_zero', { firstRaw: raws[0]!.markdown.slice(0, 1500) });
    return cases;
  };
  try {
    const deadline = new Promise<never>((_, reject) => { timeout = setTimeout(() => { controller.abort(); reject(new Error('OpenCrawl deadline exceeded.')); }, OPENCRAWL_TIMEOUT); });
    const rows = await Promise.race([work(), deadline]);
    console.info('opencrawl_precedents', { outcome: rows.length ? 'found' : 'empty', count: rows.length });
    return rows;
  } catch {
    controller.abort();
    console.warn('opencrawl_precedents', { outcome: 'unavailable' });
    return [];
  } finally { if (timeout !== undefined) clearTimeout(timeout); }
}