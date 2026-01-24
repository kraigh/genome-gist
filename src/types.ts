/**
 * GenomeGist - Core Type Definitions
 */

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

/**
 * Category of SNP (for organization/filtering)
 */
export type SNPCategory =
  | 'methylation'
  | 'detoxification'
  | 'cardiovascular'
  | 'pharmacogenomics'
  | 'neurotransmitters'
  | 'immune'
  | 'nutrition'
  | 'other';

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
