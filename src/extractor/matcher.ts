/**
 * Extractor - Matches genome variants against SNP list
 */

import type {
  GenomeVariant,
  SNPList,
  MatchedVariant,
  MissingVariant,
  ExtractionResult,
  ExtractionMetadata,
  ParseResult,
} from '../types';

const TOOL_NAME = 'GenomeGist';
const TOOL_VERSION = '1.0.0';

const DISCLAIMER = `DISCLAIMER: This file contains genetic information extracted for research and educational purposes only. This is NOT medical advice. Genetic variants may have different effects depending on other genetic and environmental factors. Consult a healthcare provider or genetic counselor for interpretation of genetic data. The annotations are derived from public databases and may not reflect the most current scientific understanding.`;

/**
 * Extract matching variants from parsed genome data
 */
export function extractVariants(
  parseResult: ParseResult,
  snpList: SNPList
): ExtractionResult {
  const genomeLookup = createGenomeLookup(parseResult.variants);

  const matched: MatchedVariant[] = [];
  const missing: MissingVariant[] = [];

  let foundCount = 0;
  let noCallCount = 0;

  // For each SNP in our list, find it in the genome
  for (const snpEntry of snpList.variants) {
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
    version: TOOL_VERSION,
    date: new Date().toISOString(),
    sourceFormat: parseResult.format,
    sourceVariantCount: parseResult.variants.length,
    snpListVersion: snpList.version,
    disclaimer: DISCLAIMER,
  };

  return {
    metadata,
    variants: matched,
    missing,
    summary: {
      found: foundCount,
      noCall: noCallCount,
      missing: missing.length,
      total: snpList.variants.length,
    },
  };
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
