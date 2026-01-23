/**
 * Output tests
 */

import { describe, it, expect } from 'vitest';
import { toYAML, generateFilename, calculateSize } from '../src/output/yaml';
import type { ExtractionResult } from '../src/types';

const mockResult: ExtractionResult = {
  metadata: {
    tool: 'GenomeGist',
    version: '1.0.0',
    date: '2025-01-23T12:00:00Z',
    sourceFormat: '23andme-v5',
    sourceVariantCount: 650000,
    snpListVersion: '2025.01',
    disclaimer: 'Test disclaimer',
  },
  variants: [
    {
      rsid: 'rs1801133',
      gene: 'MTHFR',
      genotype: 'CT',
      category: 'methylation',
      annotation: 'C677T variant',
      sources: ['ClinVar', 'PharmGKB'],
      status: 'found',
    },
    {
      rsid: 'rs4680',
      gene: 'COMT',
      genotype: '--',
      category: 'neurotransmitters',
      annotation: 'Val158Met variant',
      sources: ['SNPedia'],
      status: 'no-call',
    },
  ],
  missing: [
    {
      rsid: 'rs777777',
      gene: 'TEST',
      category: 'other',
      reason: 'not-in-file',
    },
  ],
  summary: {
    found: 1,
    noCall: 1,
    missing: 1,
    total: 3,
  },
};

describe('toYAML', () => {
  it('generates valid YAML string', () => {
    const yaml = toYAML(mockResult);
    expect(typeof yaml).toBe('string');
    expect(yaml.length).toBeGreaterThan(0);
  });

  it('includes metadata section', () => {
    const yaml = toYAML(mockResult);
    expect(yaml).toContain('metadata:');
    expect(yaml).toContain('tool: GenomeGist');
    expect(yaml).toContain('version: 1.0.0');
    expect(yaml).toContain('snp_list_version: "2025.01"');
  });

  it('includes summary section', () => {
    const yaml = toYAML(mockResult);
    expect(yaml).toContain('summary:');
    expect(yaml).toContain('variants_found: 1');
    expect(yaml).toContain('variants_no_call: 1');
    expect(yaml).toContain('variants_missing: 1');
  });

  it('includes variants with correct fields', () => {
    const yaml = toYAML(mockResult);
    expect(yaml).toContain('rsid: rs1801133');
    expect(yaml).toContain('gene: MTHFR');
    expect(yaml).toContain('genotype: CT');
    expect(yaml).toContain('category: methylation');
    expect(yaml).toContain('C677T variant');
  });

  it('marks no-call variants with status', () => {
    const yaml = toYAML(mockResult);
    // Find the COMT variant section and check it has status
    expect(yaml).toContain('status: no-call');
  });

  it('includes missing variants section', () => {
    const yaml = toYAML(mockResult);
    expect(yaml).toContain('missing_variants:');
    expect(yaml).toContain('rs777777');
    expect(yaml).toContain('reason: not-in-file');
  });

  it('omits missing_variants section when empty', () => {
    const resultNoMissing = { ...mockResult, missing: [] };
    const yaml = toYAML(resultNoMissing);
    expect(yaml).not.toContain('missing_variants:');
  });

  it('includes disclaimer', () => {
    const yaml = toYAML(mockResult);
    expect(yaml).toContain('disclaimer:');
    expect(yaml).toContain('Test disclaimer');
  });
});

describe('generateFilename', () => {
  it('generates filename with current date', () => {
    const filename = generateFilename();
    const today = new Date().toISOString().split('T')[0];
    expect(filename).toBe(`genomegist-results-${today}.yaml`);
  });

  it('has .yaml extension', () => {
    const filename = generateFilename();
    expect(filename).toMatch(/\.yaml$/);
  });
});

describe('calculateSize', () => {
  it('shows bytes for small content', () => {
    const size = calculateSize('hello');
    expect(size).toMatch(/^\d+ B$/);
  });

  it('shows KB for medium content', () => {
    const content = 'x'.repeat(2000);
    const size = calculateSize(content);
    expect(size).toMatch(/^\d+\.\d KB$/);
  });

  it('shows MB for large content', () => {
    const content = 'x'.repeat(2000000);
    const size = calculateSize(content);
    expect(size).toMatch(/^\d+\.\d MB$/);
  });
});
