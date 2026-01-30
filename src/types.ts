/**
 * GenomeGist - Core Type Definitions
 */

// Import category types from generated file (source of truth)
// These are auto-generated from the SNP list by scripts/generate-categories.cjs
import {
  type SNPCategory as GeneratedSNPCategory,
  ALL_CATEGORIES as GENERATED_ALL_CATEGORIES,
  CATEGORY_LABELS as GENERATED_CATEGORY_LABELS,
  ESTIMATED_CATEGORY_COUNTS,
  ESTIMATED_TOTAL_COUNT,
} from './generated/snp-categories';

// Re-export for consumers
export type SNPCategory = GeneratedSNPCategory;
export const ALL_CATEGORIES = GENERATED_ALL_CATEGORIES;
export const CATEGORY_LABELS = GENERATED_CATEGORY_LABELS;
export { ESTIMATED_CATEGORY_COUNTS, ESTIMATED_TOTAL_COUNT };

// =============================================================================
// Genome File Types
// =============================================================================

/**
 * A single variant from a parsed genome file
 */
export interface GenomeVariant {
  rsid: string; // e.g., "rs1801133"
  chromosome: string; // e.g., "1", "X", "MT"
  position: number; // Base pair position
  genotype: string; // e.g., "CT", "AA", "--" (no-call)
}

/**
 * Supported genome file formats
 */
export type GenomeFormat = '23andme-v5' | '23andme-v4' | '23andme-v3' | 'ancestry' | 'unknown';

/**
 * Result of parsing a genome file
 */
export interface ParseResult {
  format: GenomeFormat;
  variants: GenomeVariant[];
  metadata: {
    generatedAt?: string; // Date from file header
    build?: string; // Reference genome build (e.g., "37")
  };
  warnings?: string[]; // Non-fatal issues encountered during parsing
}

/**
 * Parse error with context - extends Error for proper error handling
 */
export class ParseError extends Error {
  line?: number;
  details?: string;

  constructor(message: string, line?: number, details?: string) {
    super(message);
    this.name = 'ParseError';
    this.line = line;
    this.details = details;
    // Ensure prototype chain is correct for instanceof checks
    Object.setPrototypeOf(this, ParseError.prototype);
  }
}

// =============================================================================
// SNP List Types
// =============================================================================

// Note: SNPCategory and ALL_CATEGORIES are imported from './generated/snp-categories'
// which is auto-generated from the SNP list by scripts/generate-categories.cjs

/**
 * Tier selection options
 * - free: Free tier with limited SNPs (~15, uses bundled SNP list)
 * - full: Paid tier with all categories (1,000+ SNPs, requires license key)
 */
export type Tier = 'free' | 'full';

/**
 * Whether a tier requires a paid license key
 */
export const TIER_REQUIRES_LICENSE: Record<Tier, boolean> = {
  free: false,
  full: true,
};

/**
 * Legacy category presets (for CLI backward compatibility)
 * @deprecated Use Tier type instead
 */
export type CategoryPreset = 'demo' | 'wellness' | 'full';

/**
 * Legacy category preset definitions (for CLI backward compatibility)
 * @deprecated Use Tier type instead
 */
export const CATEGORY_PRESETS: Record<CategoryPreset, SNPCategory[]> = {
  demo: ALL_CATEGORIES, // Free tier - all categories but limited SNPs
  wellness: ['methylation', 'vitamins_minerals', 'hormones_neurotransmitters', 'food_sensitivities'],
  full: ALL_CATEGORIES,
};

/**
 * Legacy preset token requirements (for CLI backward compatibility)
 * @deprecated Use TIER_REQUIRES_LICENSE instead
 */
export const PRESET_REQUIRES_TOKEN: Record<CategoryPreset, boolean> = {
  demo: false,
  wellness: true,
  full: true,
};

// Note: CATEGORY_LABELS is imported from './generated/snp-categories'

/**
 * Estimate of matches by category (for preview)
 */
export interface CategoryMatchEstimate {
  total: number;
  byCategory: Record<SNPCategory, number>;
}

/**
 * A single entry in the SNP list
 */
export interface SNPEntry {
  rsid: string; // e.g., "rs1801133"
  gene: string; // e.g., "MTHFR"
  category: SNPCategory;
  annotation: string; // Brief description from public sources
  sources: string[]; // e.g., ["ClinVar", "PharmGKB"]
  riskAllele?: string; // Optional: the variant allele of interest
  chromosome?: string; // For validation
  position?: number; // For validation
}

/**
 * The full SNP list structure
 */
export interface SNPList {
  version: string; // e.g., "2025.01"
  generatedAt: string; // ISO date
  count: number;
  variants: SNPEntry[];
}

// =============================================================================
// Extraction Result Types
// =============================================================================

/**
 * A matched variant with genotype
 */
export interface MatchedVariant {
  rsid: string;
  gene: string;
  genotype: string; // From genome file, e.g., "CT"
  category: SNPCategory;
  annotation: string;
  sources: string[];
  status: 'found' | 'no-call'; // 'found' = has genotype, 'no-call' = "--" in file
}

/**
 * A variant from the SNP list that wasn't found in the genome file
 */
export interface MissingVariant {
  rsid: string;
  gene: string;
  category: SNPCategory;
  reason: 'not-in-file' | 'not-genotyped';
}

/**
 * Metadata included in the output
 */
export interface ExtractionMetadata {
  tool: string; // "GenomeGist"
  version: string; // "1.0.0"
  date: string; // ISO timestamp
  sourceFormat: GenomeFormat;
  sourceVariantCount: number; // Total variants in genome file
  snpListVersion: string;
  disclaimer: string;
  categoriesIncluded?: SNPCategory[]; // Categories that were extracted (if filtered)
}

/**
 * Complete extraction result
 */
export interface ExtractionResult {
  metadata: ExtractionMetadata;
  variants: MatchedVariant[];
  missing: MissingVariant[];
  summary: {
    found: number;
    noCall: number;
    missing: number;
    total: number; // Total in SNP list
  };
}

// =============================================================================
// Output Format Types
// =============================================================================

/**
 * Output format options for AI context optimization
 *
 * - detailed: Full output with annotations (human-readable, ~180 chars/variant)
 * - compact: rsid, gene, genotype only (AI-optimized, ~35 chars/variant)
 * - minimal: CSV-style dense format (maximum density, ~20 chars/variant)
 */
export type OutputFormat = 'detailed' | 'compact' | 'minimal';

// =============================================================================
// Application State Types
// =============================================================================

/**
 * Processing status for UI
 */
export type ProcessingStatus =
  | { state: 'idle' }
  | { state: 'reading'; filename: string }
  | { state: 'parsing'; filename: string }
  | { state: 'matching'; variantCount: number }
  | { state: 'complete'; result: ExtractionResult }
  | { state: 'error'; error: ParseError };
