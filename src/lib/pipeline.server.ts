import { createClient } from '@supabase/supabase-js';
import { getRequest } from '@tanstack/react-start/server';
import { GatewayError } from '@lovable.dev/ai-gateway';
import { supabaseAdmin as db } from '@/integrations/supabase/client.server';
import type { Database, TablesInsert } from '@/integrations/supabase/types';
import { youSearch,youContents,youResearch,classify,tregSocial,opencrawlSources,ProviderFailure } from './adapters.server';
import { freshness,buildQueries,attributionQuotes,canonicalUrl,publicUrl,selectOrigin,verdictSchema,stances,sourcings } from './pipeline';
import { isIndependent,scoreMentions,type Mention } from './scoring';
import { z } from 'zod';
import { opencrawlPrecedents } from './opencrawl.server';
import { precedentQueries } from './precedents';
import { applyOfficialRules, dealParties } from './official';
const rowSchema=z.object({id:z.string(),url:z.string(),title:z.string(),domain:z.string(),outlet:z.string(),published_at:z.string().nullable(),snippet:z.string(),attribution_quotes:z.array(z.string()),stance:z.enum(stances),sourcing:z.enum(sourcings),attributes_to:z.string().nullable(),is_origin:z.boolean(),is_independent:z.boolean(),paywalled:z.boolean(),source_api:z.enum(['you_search','you_contents','you_research','treg','opencrawl']),involved_party:z.boolean(),mainstream:z.boolean(),classified:z.boolean(),contents_read:z.boolean()});
function checked<T>(result:{data:T;error:{message:string}|null}):T { if(result.error)throw new Error('Could not save or load trace evidence.');return result.data; }
export function publicDb(){const url=process.env['SUPABASE_URL'],key=process.env['SUPABASE_PUBLISHABLE_KEY'];if(!url||!key)throw new Error('Cloud configuration is unavailable.');return createClient<Database>(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>{const h=new Headers(init?.headers);if(key.startsWith('sb_')&&h.get('Authorization')===`Bearer ${key}`)h.delete('Authorization');h.set('apikey',key);return fetch(input,{...init,headers:h});}}});}
export function verifyFirstParty() { const req=getRequest();const origin=req.headers.get('origin');if(!origin||origin!==new URL(req.url).origin)throw new Error('This action must be started from Smoke.'); }
export async function createTrace(input:{query:string;entities:string[];window_days:number}) { verifyFirstParty();if(!process.env['YDC_API_KEY'])throw new Error('You.com API key is not configured.');if(/^https?:/i.test(input.query)&&!publicUrl(input.query))throw new Error('Use a publicly accessible article URL.'); const row=checked(await db.from('traces').insert({...input,claim:input.query,stage:'queued'}).select('id').single());if(!row)throw new Error('Could not create trace.');return {trace_id:row.id}; }
export async function startRecheck(id:string){verifyFirstParty();const row=checked(await db.from('traces').select('stage,paused').eq('id',id).single());if(!row)throw new Error('Trace not found.');if(!['done','error'].includes(row.stage))return {trace_id:id};if(row.paused)throw new Error('Processing is paused. Restore provider access before starting a fresh trace.');checked(await db.from('traces').update({stage:'searching',rechecking:true,error:null,research_result:null,lease_until:null}).eq('id',id));return {trace_id:id};}
export async function processStage(id:string) {
 verifyFirstParty();const token=crypto.randomUUID();const acquired=checked(await db.rpc('acquire_trace_lease',{p_id:id,p_token:token}));if(!acquired)return;
 try {
 const trace=checked(await db.from('traces').select('*').eq('id',id).single());if(!trace)throw new Error('Trace not found.');if(trace.paused)return;
 const update=async(values:Database['public']['Tables']['traces']['Update'])=>checked(await db.from('traces').update(values).eq('id',id).eq('lease_token',token));
 const all=async()=>z.array(rowSchema).parse(checked(await db.from('mentions').select('*').eq('trace_id',id).order('published_at',{ascending:true,nullsFirst:false}).limit(200)));
 const append=async(ms:Mention[])=>{if(!ms.length)return;const rows:TablesInsert<'mentions'>[]=ms.map(m=>({...m,trace_id:id}));checked(await db.from('mentions').upsert(rows,{onConflict:'trace_id,url',ignoreDuplicates:true}));};
 const entities=z.array(z.string()).parse(trace.entities);const f=trace.rechecking?'week':freshness(trace.window_days,new Date());
 if(trace.stage==='queued') {
  let claim=trace.claim;if(/^https?:/i.test(trace.query)){const pages=await youContents([trace.query]);claim=pages[0]?.title??trace.query;}
  await update({claim,stage:'searching'});
 } else if(trace.stage==='searching') {
  const mentions=await youSearch(buildQueries(trace.claim,entities),f);const extras=await Promise.all([tregSocial(),opencrawlSources()]);await append([...mentions,...extras.flat()]);await update({stage:'reading'});
 } else if(trace.stage==='reading') {
  const earliest=(await all()).filter(m=>m.mainstream&&!m.contents_read).slice(0,8);let pages:Awaited<ReturnType<typeof youContents>>=[];
  try{pages=await youContents(earliest.map(m=>m.url));}catch(e){if(e instanceof ProviderFailure&&[401,402,403,429].includes(e.status))throw e;console.warn('Contents unavailable; using search snippets.');}
  for(const m of earliest){const p=pages.find(p=>canonicalUrl(p.url)===m.url);const content=p?.markdown??'';checked(await db.from('mentions').update({attribution_quotes:attributionQuotes(content),paywalled:content.length<500,contents_read:true,source_api:content?'you_contents':m.source_api}).eq('id',m.id));}await update({stage:'classifying'});
 } else if(trace.stage==='classifying') {
  const pending=(await all()).filter(m=>!m.classified).slice(0,20);
  if(pending.length){const batches=[pending.slice(0,10),pending.slice(10,20)].filter(b=>b.length);const results=await Promise.all(batches.map(b=>classify(trace.claim,b)));const returned=new Set(results.flat().map(r=>r.id));if(!returned.size){for(const m of pending)checked(await db.from('mentions').update({classified:true,stance:'unrelated'}).eq('id',m.id));}for(const result of results.flat()){const original=pending.find(m=>m.id===result.id);if(!original)continue;const attributes=result.attributes_to?canonicalUrl(result.attributes_to)?.replace(/^https?:\/\//,'').split('/')[0]??result.attributes_to:null;const aiSourcing=original.sourcing==='social'?'social':attributes?'cites outlet':result.sourcing;const ruled=applyOfficialRules({...original,stance:result.stance,sourcing:aiSourcing,involved_party:result.involved_party},dealParties(trace.claim,entities));const official=ruled.sourcing==='official statement'||ruled.sourcing==='filing';const sourcing=original.sourcing==='social'&&!official?'social':ruled.sourcing;const attrs=official?null:attributes;checked(await db.from('mentions').update({...result,stance:ruled.stance,involved_party:ruled.involved_party,sourcing,attributes_to:attrs,classified:true,is_independent:isIndependent({...original,...result,stance:ruled.stance,sourcing,attributes_to:attrs})}).eq('id',result.id));}}
   if(!(await all()).some(m=>!m.classified))await update({stage:trace.research_result?'scoring':'precedents'});
  } else if(trace.stage==='precedents') {
   try {
    const origin=selectOrigin(await all());
    const cases=await opencrawlPrecedents(precedentQueries(trace.claim,entities,origin?.outlet));
    if(cases.length)checked(await db.from('precedents').upsert(cases.map(c=>({...c,trace_id:id})),{onConflict:'trace_id,document_id'}));
   } catch { console.warn('opencrawl_precedents',{outcome:'save_unavailable'}); }
   await update({stage:'verifying'});
 } else if(trace.stage==='verifying') {
  try{const result=await youResearch(trace.claim,await all(),f);await append(result.mentions);await update({research_result:result.verdict,stage:'classifying'});}
  catch(e){if((e instanceof ProviderFailure&&[401,402,403,429].includes(e.status))||e instanceof GatewayError)throw e;console.warn('Research unavailable; finishing with deterministic evidence rules.');await update({research_result:{unavailable:true},stage:'scoring'});}
 } else if(trace.stage==='scoring') {
  const mentions=await all(),score=scoreMentions(mentions,new Date()),origin=selectOrigin(mentions),verdict=verdictSchema.safeParse(trace.research_result);
  for(const m of mentions)checked(await db.from('mentions').update({is_origin:m.id===origin?.id,is_independent:isIndependent(m)}).eq('id',m.id));
  const old=checked(await db.from('status_history').select('status').eq('trace_id',id).order('at',{ascending:false}).limit(1));
  if(old?.[0]?.status!==score.status)checked(await db.from('status_history').insert({trace_id:id,status:score.status,reason:trace.rechecking?'Re-check found a status change.':'Rules-based evaluation of independent evidence.'}));
  await update({stage:'done',status:score.status,smoke_score:score.smokeScore,confidence:verdict.success?verdict.data.confidence:0,summary_md:verdict.success?`Rules-based status: ${score.status}. ${verdict.data.status!==score.status?'The Research assessment differs; the status above follows the collected source evidence. ':''}${verdict.data.summary}`:'Verdict unavailable; rules-based status shown.',confirm_signals:verdict.success?verdict.data.confirm_signals:[],kill_signals:verdict.success?verdict.data.kill_signals:[],watch_signals:verdict.success?verdict.data.watch_signals:[],analyst_note:verdict.success&&verdict.data.status!==score.status?{status:verdict.data.status,reason:(verdict.data.summary.split(/(?<=[.!?])\s/)[0]??'').slice(0,240)}:null,origin_mention_id:origin?.id??null,checked_at:new Date().toISOString(),rechecking:false,error:null});
 }
 }catch(e){const status=e instanceof ProviderFailure?e.status:e instanceof GatewayError?e.httpStatus:undefined;const paused=Boolean(status&&[401,402,403,429].includes(status));const error=paused?`Processing paused: ${status===429?'provider rate limit; try a fresh trace later':status===402?'provider credits need attention':'provider access needs attention'}.`:e instanceof Error?e.message:'Trace processing failed.';console.error('trace_stage_failed',{trace_id:id,status:status??500});await db.from('traces').update({stage:'error',error,paused}).eq('id',id).eq('lease_token',token);
 }finally{await db.from('traces').update({lease_until:null,lease_token:null}).eq('id',id).eq('lease_token',token);}
}
