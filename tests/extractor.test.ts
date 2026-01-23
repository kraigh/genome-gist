/**
 * Extractor tests
 */

import { describe, it, expect } from 'vitest';
import { extractVariants } from '../src/extractor/matcher';
import type { ParseResult, SNPList } from '../src/types';

// Mock parsed genome data
const mockParseResult: ParseResult = {
  format: '23andme-v5',
  variants: [
    { rsid: 'rs1801133', chromosome: '1', position: 11856378, genotype: 'CT' },
    { rsid: 'rs4680', chromosome: '22', position: 19951271, genotype: 'AG' },
    { rsid: 'rs429358', chromosome: '19', position: 45411941, genotype: 'TT' },
    { rsid: 'rs999999', chromosome: '1', position: 12345, genotype: '--' }, // no-call
    { rsid: 'rs888888', chromosome: '2', position: 54321, genotype: 'GG' }, // not in SNP list
  ],
  metadata: {
    generatedAt: '2024-08-05',
    build: '37',
  },
};

// Mock SNP list
const mockSNPList: SNPList = {
  version: '2025.01',
  generatedAt: '2025-01-23T00:00:00Z',
  count: 4,
  variants: [
    {
      rsid: 'rs1801133',
      gene: 'MTHFR',
      category: 'methylation',
      annotation: 'C677T variant',
      sources: ['ClinVar'],
    },
    {
      rsid: 'rs4680',
      gene: 'COMT',
      category: 'neurotransmitters',
      annotation: 'Val158Met variant',
      sources: ['PharmGKB'],
    },
    {
      rsid: 'rs999999',
      gene: 'TEST',
      category: 'other',
      annotation: 'Test no-call',
      sources: ['Test'],
    },
    {
      rsid: 'rs777777',
      gene: 'MISSING',
      category: 'other',
      annotation: 'Not in genome file',
      sources: ['Test'],
    },
  ],
};

describe('extractVariants', () => {
  it('matches variants correctly', () => {
    const result = extractVariants(mockParseResult, mockSNPList);

    expect(result.variants).toHaveLength(3); // rs1801133, rs4680, rs999999
    expect(result.missing).toHaveLength(1); // rs777777
  });

  it('extracts correct genotypes', () => {
    const result = extractVariants(mockParseResult, mockSNPList);

    const mthfr = result.variants.find((v) => v.rsid === 'rs1801133');
    expect(mthfr?.genotype).toBe('CT');

    const comt = result.variants.find((v) => v.rsid === 'rs4680');
    expect(comt?.genotype).toBe('AG');
  });

  it('marks no-call genotypes correctly', () => {
    const result = extractVariants(mockParseResult, mockSNPList);

    const noCall = result.variants.find((v) => v.rsid === 'rs999999');
    expect(noCall?.status).toBe('no-call');
    expect(noCall?.genotype).toBe('--');
  });

  it('marks found genotypes correctly', () => {
    const result = extractVariants(mockParseResult, mockSNPList);

    const found = result.variants.find((v) => v.rsid === 'rs1801133');
    expect(found?.status).toBe('found');
  });

  it('identifies missing variants', () => {
    const result = extractVariants(mockParseResult, mockSNPList);

    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]?.rsid).toBe('rs777777');
    expect(result.missing[0]?.reason).toBe('not-in-file');
  });

  it('includes SNP metadata in matched variants', () => {
    const result = extractVariants(mockParseResult, mockSNPList);

    const mthfr = result.variants.find((v) => v.rsid === 'rs1801133');
    expect(mthfr?.gene).toBe('MTHFR');
    expect(mthfr?.category).toBe('methylation');
    expect(mthfr?.annotation).toBe('C677T variant');
    expect(mthfr?.sources).toEqual(['ClinVar']);
  });

  it('calculates summary correctly', () => {
    const result = extractVariants(mockParseResult, mockSNPList);

    expect(result.summary.found).toBe(2); // rs1801133, rs4680
    expect(result.summary.noCall).toBe(1); // rs999999
    expect(result.summary.missing).toBe(1); // rs777777
    expect(result.summary.total).toBe(4);
  });

  it('includes extraction metadata', () => {
    const result = extractVariants(mockParseResult, mockSNPList);

    expect(result.metadata.tool).toBe('GenomeGist');
    expect(result.metadata.version).toBe('1.0.0');
    expect(result.metadata.sourceFormat).toBe('23andme-v5');
    expect(result.metadata.snpListVersion).toBe('2025.01');
    expect(result.metadata.sourceVariantCount).toBe(5);
    expect(result.metadata.disclaimer).toContain('NOT medical advice');
  });

  it('handles case-insensitive rsid matching', () => {
    const parseResultUpper: ParseResult = {
      ...mockParseResult,
      variants: [
        { rsid: 'RS1801133', chromosome: '1', position: 11856378, genotype: 'CT' },
      ],
    };

    const result = extractVariants(parseResultUpper, mockSNPList);
    expect(result.variants).toHaveLength(1);
    expect(result.variants[0]?.rsid).toBe('rs1801133');
  });
});
