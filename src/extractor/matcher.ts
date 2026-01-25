/**
 * Extractor - Matches genome variants against SNP list
 */

import type {
  GenomeVariant,
  SNPList,
  SNPCategory,
  MatchedVariant,
  MissingVariant,
  ExtractionResult,
  ExtractionMetadata,
  ParseResult,
  CategoryMatchEstimate,
} from '../types';
import { ALL_CATEGORIES } from '../types';
import { VERSION, TOOL_NAME } from '../version';

const DISCLAIMER = `DISCLAIMER: This file contains genetic information extracted for research and educational purposes only. This is NOT medical advice. Genetic variants may have different effects depending on other genetic and environmental factors. Consult a healthcare provider or genetic counselor for interpretation of genetic data. The annotations are derived from public databases and may not reflect the most current scientific understanding.`;

/**
 * Extract matching variants from parsed genome data
 * @param parseResult Parsed genome file
 * @param snpList Target SNP list
 * @param categoryFilter Optional array of categories to include (default: all)
 */
export function extractVariants(
  parseResult: ParseResult,
  snpList: SNPList,
  categoryFilter?: SNPCategory[]
): ExtractionResult {
  const genomeLookup = createGenomeLookup(parseResult.variants);

  // Filter SNP list by categories if specified
  const filteredVariants = categoryFilter
    ? snpList.variants.filter((v) => categoryFilter.includes(v.category))
    : snpList.variants;

  const matched: MatchedVariant[] = [];
  const missing: MissingVariant[] = [];

  let foundCount = 0;
  let noCallCount = 0;

  // For each SNP in our list, find it in the genome
  for (const snpEntry of filteredVariants) {
    const rsidLower = snpEntry.rsid.toLowerCase();
    const genomeVariant = genomeLookup.get(rsidLower);

    if (genomeVariant) {
      const isNoCall = genomeVariant.genotype === '--';

      if (isNoCall) {
        noCallCount++;
      } else {
        foundCount++;
      }

      matched.push({
        rsid: snpEntry.rsid,
        gene: snpEntry.gene,
        genotype: genomeVariant.genotype,
        category: snpEntry.category,
        annotation: snpEntry.annotation,
        sources: snpEntry.sources,
        status: isNoCall ? 'no-call' : 'found',
      });
    } else {
      missing.push({
        rsid: snpEntry.rsid,
        gene: snpEntry.gene,
        category: snpEntry.category,
        reason: 'not-in-file',
      });
    }
  }

  const metadata: ExtractionMetadata = {
    tool: TOOL_NAME,
    version: VERSION,
    date: new Date().toISOString(),
    sourceFormat: parseResult.format,
    sourceVariantCount: parseResult.variants.length,
    snpListVersion: snpList.version,
    disclaimer: DISCLAIMER,
    categoriesIncluded: categoryFilter,
  };

  return {
    metadata,
    variants: matched,
    missing,
    summary: {
      found: foundCount,
      noCall: noCallCount,
      missing: missing.length,
      total: filteredVariants.length,
    },
  };
}

/**
 * Estimate matches by category without full extraction
 * Used for preview UI to show expected results
 */
export function estimateMatches(
  parseResult: ParseResult,
  snpList: SNPList,
  categoryFilter?: SNPCategory[]
): CategoryMatchEstimate {
  const genomeLookup = createGenomeLookup(parseResult.variants);
  const categories = categoryFilter ?? ALL_CATEGORIES;

  // Initialize counts for all categories
  const byCategory: Record<SNPCategory, number> = {
    methylation: 0,
    detoxification: 0,
    cardiovascular: 0,
    pharmacogenomics: 0,
    neurotransmitters: 0,
    immune: 0,
    nutrition: 0,
    other: 0,
  };

  for (const snpEntry of snpList.variants) {
    // Skip if category not in filter
    if (!categories.includes(snpEntry.category)) {
      continue;
    }

    const rsidLower = snpEntry.rsid.toLowerCase();
    if (genomeLookup.has(rsidLower)) {
      byCategory[snpEntry.category]++;
    }
  }

  const total = Object.values(byCategory).reduce((a, b) => a + b, 0);
  return { total, byCategory };
}

/**
 * Create a lookup map from genome variants for efficient matching
 */
function createGenomeLookup(variants: GenomeVariant[]): Map<string, GenomeVariant> {
  const lookup = new Map<string, GenomeVariant>();

  for (const variant of variants) {
    lookup.set(variant.rsid.toLowerCase(), variant);
  }

  return lookup;
}
