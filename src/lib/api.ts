// Sample-only facade. No network requests are made at this stage.
import { sampleTraces, type Trace } from '@/mocks/sampleTraces';
export type TraceInput = { query: string; window_days: number; companyA?: string; companyB?: string };
export const getTrace = (id: string): Trace | undefined => sampleTraces.find(t => t.id === id);
export const traceRumor = (input: TraceInput): Trace | undefined => sampleTraces.find(t => `${t.claim} ${t.entities.join(' ')}`.toLowerCase().includes(input.query.toLowerCase().trim())) ?? (/aster|layoff/i.test(input.query) ? sampleTraces[1] : /northwind|helix|acquisition|robotics/i.test(input.query) ? sampleTraces[0] : undefined);