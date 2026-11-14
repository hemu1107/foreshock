import { describe, it, expect } from 'vitest';
import { evidenceLabel, claimType } from './featured';
describe('featured helpers', () => {
  it('labels evidence strength by Smoke Score', () => { expect(evidenceLabel(80)).toBe('Strong evidence'); expect(evidenceLabel(50)).toBe('Moderate evidence'); expect(evidenceLabel(20)).toBe('Weak evidence'); });
  it('types acquisition claims as M&A', () => { expect(claimType('Netflix to acquire Warner Bros')).toBe('M&A'); });
});
