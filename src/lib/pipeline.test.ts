import {describe,it,expect} from 'vitest';
import {freshness,buildQueries,canonicalUrl,attributionQuotes,sourceMention,selectOrigin,publicUrl} from './pipeline';
import {sampleTraces} from '@/mocks/sampleTraces';
const now=new Date('2026-11-14T17:02:00Z');
describe('Live pipeline rules',()=>{
 it('maps a seven-day window to week',()=>expect(freshness(7,now)).toBe('week'));
 it('maps a thirty-day window to month',()=>expect(freshness(30,now)).toBe('month'));
 it('maps ninety days to an exact date range',()=>expect(freshness(90,now)).toBe('2026-08-16to2026-11-14'));
 it('strips all query parameters and fragments for deduplication',()=>expect(canonicalUrl('https://reuters.com/story?utm_source=x&id=4#top')).toBe('https://reuters.com/story'));
 it('builds six rumor, talks, acquisition, denial, confirmation and statement queries',()=>expect(buildQueries('A buys B',['A','B'])).toEqual(['A buys B','A B talks','A acquisition','A denies','A confirms','A statement']));
 it('extracts at most three attribution sentences',()=>expect(attributionQuotes('Sources said talks started. According to Reuters, no deal. People familiar said more. They confirmed details.')).toHaveLength(3));
 it('preserves unavailable publication dates rather than inventing dates',()=>expect(sourceMention({url:'https://reuters.com/story',page_age:'not-a-date'},'you_search')?.published_at).toBe(null));
 it('tags social sources and preserves the adapter tag',()=>expect(sourceMention({url:'https://x.com/example'},'treg')).toMatchObject({sourcing:'social',mainstream:false,source_api:'treg'}));
 it('selects the earliest independently reported origin',()=>expect(selectOrigin(sampleTraces[0]?.mentions??[])?.outlet).toBe('Bloomberg'));
 it('rejects private URLs for article normalization',()=>expect(publicUrl('http://169.254.169.254/latest/meta-data')).toBe(false));
});
