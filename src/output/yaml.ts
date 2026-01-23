/**
 * YAML Output Generator
 *
 * Converts extraction results to YAML format for download.
 * Uses js-yaml for serialization.
 */

import * as yaml from 'js-yaml';
import type { ExtractionResult, MatchedVariant } from '../types';

/**
 * Convert extraction result to YAML string
 */
export function toYAML(result: ExtractionResult): string {
  // Build a clean output structure
  const output = {
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
    (output as Record<string, unknown>).missing_variants = result.missing.map((v) => ({
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
function formatVariant(variant: MatchedVariant): Record<string, unknown> {
  const output: Record<string, unknown> = {
    rsid: variant.rsid,
    gene: variant.gene,
    genotype: variant.genotype,
    category: variant.category,
  };

  // Add status only if no-call
  if (variant.status === 'no-call') {
    output.status = 'no-call';
  }

  output.annotation = variant.annotation;
  output.sources = variant.sources;

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
