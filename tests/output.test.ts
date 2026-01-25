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

describe('toYAML compact format', () => {
  it('generates smaller output than detailed', () => {
    const detailed = toYAML(mockResult, 'detailed');
    const compact = toYAML(mockResult, 'compact');
    expect(compact.length).toBeLessThan(detailed.length);
  });

  it('includes metadata with shortened fields', () => {
    const yaml = toYAML(mockResult, 'compact');
    expect(yaml).toContain('metadata:');
    expect(yaml).toContain('tool: GenomeGist');
    expect(yaml).toMatch(/date: ['"]?2025-01-23['"]?/);
  });

  it('includes variants with only rsid, gene, genotype', () => {
    const yaml = toYAML(mockResult, 'compact');
    expect(yaml).toContain('rsid: rs1801133');
    expect(yaml).toContain('gene: MTHFR');
    expect(yaml).toContain('genotype: CT');
    // Should NOT include annotation or category in compact format
    expect(yaml).not.toContain('annotation:');
    expect(yaml).not.toContain('category:');
  });

  it('lists missing variants as rsid only', () => {
    const yaml = toYAML(mockResult, 'compact');
    expect(yaml).toContain('missing:');
    expect(yaml).toContain('rs777777');
  });

  it('includes compact disclaimer', () => {
    const yaml = toYAML(mockResult, 'compact');
    expect(yaml).toContain('For research/educational use only');
  });
});

describe('toYAML minimal format', () => {
  it('generates CSV-style output', () => {
    const csv = toYAML(mockResult, 'minimal');
    expect(csv).toContain('# rsid,gene,genotype');
    expect(csv).toContain('rs1801133,MTHFR,CT');
    expect(csv).toContain('rs4680,COMT,--');
  });

  it('generates smallest output', () => {
    const detailed = toYAML(mockResult, 'detailed');
    const compact = toYAML(mockResult, 'compact');
    const minimal = toYAML(mockResult, 'minimal');
    expect(minimal.length).toBeLessThan(compact.length);
    expect(minimal.length).toBeLessThan(detailed.length);
  });

  it('includes header comment with tool info', () => {
    const csv = toYAML(mockResult, 'minimal');
    expect(csv).toContain('# GenomeGist v1.0.0');
    expect(csv).toContain('2025-01-23');
  });

  it('lists missing variants in comment', () => {
    const csv = toYAML(mockResult, 'minimal');
    expect(csv).toContain('# missing: rs777777');
  });
});

describe('generateFilename', () => {
  it('generates filename with current date for detailed', () => {
    const filename = generateFilename('detailed');
    const today = new Date().toISOString().slice(0, 10);
    expect(filename).toBe(`genomegist-results-${today}.yaml`);
  });

  it('generates filename with suffix for compact', () => {
    const filename = generateFilename('compact');
    const today = new Date().toISOString().slice(0, 10);
    expect(filename).toBe(`genomegist-results-compact-${today}.yaml`);
  });

  it('generates .csv extension for minimal', () => {
    const filename = generateFilename('minimal');
    const today = new Date().toISOString().slice(0, 10);
    expect(filename).toBe(`genomegist-results-minimal-${today}.csv`);
  });

  it('has .yaml extension for detailed', () => {
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
