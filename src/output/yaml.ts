/**
 * YAML Output Generator
 *
 * Converts extraction results to various output formats.
 * Supports detailed (human-readable), compact (AI-optimized), and minimal (CSV-style).
 */

import * as yaml from 'js-yaml';
import type { ExtractionResult, MissingVariant, SNPCategory, OutputFormat } from '../types';

/** Detailed YAML output structure */
interface DetailedOutput {
  metadata: {
    tool: string;
    version: string;
    extraction_date: string;
    source_format: string;
    source_variant_count: number;
    snp_list_version: string;
    categories_included?: SNPCategory[];
    disclaimer: string;
  };
  summary: {
    variants_found: number;
    variants_no_call: number;
    variants_missing: number;
    total_in_snp_list: number;
  };
  variants: DetailedVariant[];
  missing_variants?: FormattedMissingVariant[];
}

/** Detailed variant format */
interface DetailedVariant {
  rsid: string;
  gene: string;
  genotype: string;
  category: SNPCategory;
  status?: 'no-call';
  annotation: string;
}

/** Compact output structure */
interface CompactOutput {
  metadata: {
    tool: string;
    version: string;
    date: string;
    format: string;
    disclaimer: string;
  };
  variants: CompactVariant[];
  missing?: string[];
}

/** Compact variant format */
interface CompactVariant {
  rsid: string;
  gene: string;
  genotype: string;
}

/** Formatted missing variant for detailed output */
interface FormattedMissingVariant {
  rsid: string;
  gene: string;
  category: SNPCategory;
  reason: MissingVariant['reason'];
}

const COMPACT_DISCLAIMER = 'For research/educational use only. Not medical advice.';

/**
 * Extract date portion from ISO date string (safer than split)
 */
function formatDateOnly(isoDate: string): string {
  return isoDate.slice(0, 10); // "2025-01-23T..." -> "2025-01-23"
}

/**
 * Convert extraction result to output string
 */
export function toYAML(result: ExtractionResult, format: OutputFormat = 'detailed'): string {
  switch (format) {
    case 'detailed':
      return toDetailedYAML(result);
    case 'compact':
      return toCompactYAML(result);
    case 'minimal':
      return toMinimalCSV(result);
  }
}

/**
 * Detailed format - full output with annotations (human-readable)
 */
function toDetailedYAML(result: ExtractionResult): string {
  const output: DetailedOutput = {
    metadata: {
      tool: result.metadata.tool,
      version: result.metadata.version,
      extraction_date: result.metadata.date,
      source_format: result.metadata.sourceFormat,
      source_variant_count: result.metadata.sourceVariantCount,
      snp_list_version: result.metadata.snpListVersion,
      categories_included: result.metadata.categoriesIncluded,
      disclaimer: result.metadata.disclaimer,
    },
    summary: {
      variants_found: result.summary.found,
      variants_no_call: result.summary.noCall,
      variants_missing: result.summary.missing,
      total_in_snp_list: result.summary.total,
    },
    variants: result.variants.map((v) => {
      const variant: DetailedVariant = {
        rsid: v.rsid,
        gene: v.gene,
        genotype: v.genotype,
        category: v.category,
        annotation: v.annotation,
      };
      if (v.status === 'no-call') {
        variant.status = 'no-call';
      }
      return variant;
    }),
  };

  if (result.missing.length > 0) {
    output.missing_variants = result.missing.map((v) => ({
      rsid: v.rsid,
      gene: v.gene,
      category: v.category,
      reason: v.reason,
    }));
  }

  return yaml.dump(output, {
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
    quotingType: '"',
    forceQuotes: false,
  });
}

/**
 * Compact format - rsid, gene, genotype only (AI-optimized)
 */
function toCompactYAML(result: ExtractionResult): string {
  const output: CompactOutput = {
    metadata: {
      tool: result.metadata.tool,
      version: result.metadata.version,
      date: formatDateOnly(result.metadata.date),
      format: result.metadata.sourceFormat,
      disclaimer: COMPACT_DISCLAIMER,
    },
    variants: result.variants.map((v) => ({
      rsid: v.rsid,
      gene: v.gene,
      genotype: v.genotype,
    })),
  };

  if (result.missing.length > 0) {
    output.missing = result.missing.map((v) => v.rsid);
  }

  return yaml.dump(output, {
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
    flowLevel: -1,
  });
}

/**
 * Minimal format - CSV-style for maximum density
 */
function toMinimalCSV(result: ExtractionResult): string {
  const lines: string[] = [
    `# ${result.metadata.tool} v${result.metadata.version} | ${formatDateOnly(result.metadata.date)} | ${COMPACT_DISCLAIMER}`,
    '# rsid,gene,genotype',
  ];

  for (const v of result.variants) {
    lines.push(`${v.rsid},${v.gene},${v.genotype}`);
  }

  if (result.missing.length > 0) {
    lines.push(`# missing: ${result.missing.map((v) => v.rsid).join(',')}`);
  }

  return lines.join('\n') + '\n';
}

/**
 * Generate filename for download
 * Uses user-friendly naming: my-genome-snps-{date}.{ext}
 */
export function generateFilename(format: OutputFormat = 'detailed'): string {
  const date = formatDateOnly(new Date().toISOString());
  const ext = format === 'minimal' ? 'csv' : 'yaml';
  const formatSuffix = format === 'detailed' ? '' : `-${format}`;
  return `my-genome-snps${formatSuffix}-${date}.${ext}`;
}

/**
 * Calculate approximate file size for display
 */
export function calculateSize(content: string): string {
  const bytes = new Blob([content]).size;

  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

/**
 * Get human-readable format name
 */
export function formatDisplayName(format: OutputFormat): string {
  switch (format) {
    case 'detailed':
      return 'Detailed (human-readable)';
    case 'compact':
      return 'Compact (AI-optimized)';
    case 'minimal':
      return 'Minimal (CSV)';
  }
}
