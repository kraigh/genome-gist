/**
 * YAML Output Generator
 *
 * Converts extraction results to YAML format for download.
 * Uses js-yaml for serialization.
 */

import * as yaml from 'js-yaml';
import type { ExtractionResult, MatchedVariant, MissingVariant, SNPCategory } from '../types';

/** YAML output structure */
interface YAMLOutput {
  metadata: {
    tool: string;
    version: string;
    extraction_date: string;
    source_format: string;
    source_variant_count: number;
    snp_list_version: string;
    disclaimer: string;
  };
  summary: {
    variants_found: number;
    variants_no_call: number;
    variants_missing: number;
    total_in_snp_list: number;
  };
  variants: FormattedVariant[];
  missing_variants?: FormattedMissingVariant[];
}

/** Formatted variant for YAML output */
interface FormattedVariant {
  rsid: string;
  gene: string;
  genotype: string;
  category: SNPCategory;
  status?: 'no-call';
  annotation: string;
  sources: string[];
}

/** Formatted missing variant for YAML output */
interface FormattedMissingVariant {
  rsid: string;
  gene: string;
  category: SNPCategory;
  reason: MissingVariant['reason'];
}

/**
 * Convert extraction result to YAML string
 */
export function toYAML(result: ExtractionResult): string {
  // Build a clean output structure
  const output: YAMLOutput = {
    metadata: {
      tool: result.metadata.tool,
      version: result.metadata.version,
      extraction_date: result.metadata.date,
      source_format: result.metadata.sourceFormat,
      source_variant_count: result.metadata.sourceVariantCount,
      snp_list_version: result.metadata.snpListVersion,
      disclaimer: result.metadata.disclaimer,
    },
    summary: {
      variants_found: result.summary.found,
      variants_no_call: result.summary.noCall,
      variants_missing: result.summary.missing,
      total_in_snp_list: result.summary.total,
    },
    variants: result.variants.map(formatVariant),
  };

  // Add missing variants section if any
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
 * Format a single variant for YAML output
 */
function formatVariant(variant: MatchedVariant): FormattedVariant {
  const output: FormattedVariant = {
    rsid: variant.rsid,
    gene: variant.gene,
    genotype: variant.genotype,
    category: variant.category,
    annotation: variant.annotation,
    sources: variant.sources,
  };

  // Add status only if no-call
  if (variant.status === 'no-call') {
    output.status = 'no-call';
  }

  return output;
}

/**
 * Generate filename for download
 */
export function generateFilename(): string {
  const date = new Date().toISOString().split('T')[0];
  return `genomegist-results-${date}.yaml`;
}

/**
 * Calculate approximate file size for display
 */
export function calculateSize(yamlContent: string): string {
  const bytes = new Blob([yamlContent]).size;

  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
