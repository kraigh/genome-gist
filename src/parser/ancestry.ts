/**
 * Parser for AncestryDNA genome files
 *
 * AncestryDNA format:
 * - Comment lines start with #
 * - Header line: rsid\tchromosome\tposition\tallele1\tallele2
 * - Data lines: rsid\tchromosome\tposition\tallele1\tallele2 (tab-separated)
 * - Chromosomes use numeric encoding: 23=X, 24=Y, 26=MT
 * - Genotypes are split into two separate allele columns
 */

import type { GenomeVariant, ParseResult } from '../types';
import { ParseError } from '../types';

/** Internal error tracking during parsing */
interface ParseWarning {
  message: string;
  line: number;
  details?: string;
}

/**
 * Parse an AncestryDNA genome file
 * @param content Raw file content
 * @returns ParseResult with variants and metadata
 * @throws ParseError if file is invalid
 */
export function parseAncestry(content: string): ParseResult {
  const lines = content.split(/\r?\n/); // Handle both Unix and Windows line endings
  const variants: GenomeVariant[] = [];
  const warnings: ParseWarning[] = [];

  let generatedAt: string | undefined;
  let build: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const trimmed = line.trim();

    // Skip empty lines
    if (trimmed.length === 0) continue;

    // Parse comment lines for metadata
    if (trimmed.startsWith('#')) {
      // Extract generation date (various formats)
      const dateMatch = trimmed.match(/(?:generated|created|downloaded)\s*(?:at|on)?:?\s*(.+)/i);
      if (dateMatch?.[1]) {
        generatedAt = dateMatch[1].trim();
      }

      // Extract build info
      const buildMatch = trimmed.match(/(?:build|assembly)\s*:?\s*(\d+|GRCh\d+)/i);
      if (buildMatch?.[1]) {
        build = buildMatch[1];
      }

      continue;
    }

    // Skip header line
    if (trimmed.toLowerCase().startsWith('rsid\t')) {
      continue;
    }

    // Parse data line
    const variant = parseDataLine(trimmed);
    if (variant) {
      variants.push(variant);
    } else if (trimmed.length > 0 && !trimmed.startsWith('rsid')) {
      // Only track warnings for non-empty, non-header lines that failed to parse
      warnings.push({
        message: 'Failed to parse line',
        line: i + 1,
        details: trimmed.slice(0, 100),
      });
    }
  }

  // Validate we got some data
  if (variants.length === 0) {
    throw new ParseError('No valid variants found in file. Please check the file format.');
  }

  // Build result with optional warnings
  const result: ParseResult = {
    format: 'ancestry',
    variants,
    metadata: {
      generatedAt,
      build,
    },
  };

  // Include warnings if there were parse failures
  if (warnings.length > 0) {
    result.warnings = [
      `${warnings.length} line${warnings.length === 1 ? '' : 's'} could not be parsed`,
    ];
  }

  return result;
}

/**
 * Parse a single data line
 * Format: rsid\tchromosome\tposition\tallele1\tallele2
 */
function parseDataLine(line: string): GenomeVariant | null {
  // Split by tab
  const parts = line.split('\t');

  if (parts.length < 5) {
    return null;
  }

  const [rsid, chromosome, positionStr, allele1, allele2] = parts;

  // Validate rsid (should start with 'rs' or 'i' for internal IDs)
  if (!rsid || (!rsid.startsWith('rs') && !rsid.startsWith('i'))) {
    return null;
  }

  // Validate and normalize chromosome (AncestryDNA uses numeric for sex chromosomes)
  if (!chromosome || !isValidChromosome(chromosome)) {
    return null;
  }

  // Parse position (genomic coordinates are 1-based, so 0 is invalid)
  const position = parseInt(positionStr ?? '', 10);
  if (isNaN(position) || position <= 0) {
    return null;
  }

  // Validate alleles
  if (!allele1 || !allele2) {
    return null;
  }

  // Combine alleles into genotype
  const genotype = combineAlleles(allele1, allele2);
  if (!genotype) {
    return null;
  }

  return {
    rsid: rsid.toLowerCase(), // Normalize to lowercase
    chromosome: normalizeChromosome(chromosome),
    position,
    genotype,
  };
}

/**
 * Check if chromosome value is valid (AncestryDNA uses numeric encoding)
 */
function isValidChromosome(chr: string): boolean {
  // Autosomes 1-22
  if (/^[1-9]$|^1[0-9]$|^2[0-2]$/.test(chr)) return true;
  // Sex chromosomes: 23=X, 24=Y
  if (chr === '23' || chr === '24') return true;
  // Mitochondrial: 26=MT (AncestryDNA uses 26, some files may use 25)
  if (chr === '25' || chr === '26') return true;
  // Also accept standard chromosome names (some AncestryDNA versions may use them)
  if (['X', 'Y', 'MT', 'M'].includes(chr.toUpperCase())) return true;
  return false;
}

/**
 * Normalize chromosome representation (convert AncestryDNA numeric to standard)
 */
function normalizeChromosome(chr: string): string {
  switch (chr) {
    case '23':
      return 'X';
    case '24':
      return 'Y';
    case '25':
    case '26':
      return 'MT';
    default:
      // Handle already-standard names
      const upper = chr.toUpperCase();
      if (upper === 'M') return 'MT';
      return upper;
  }
}

/**
 * Combine two alleles into a genotype string
 * @returns Combined genotype or null if invalid
 */
function combineAlleles(allele1: string, allele2: string): string | null {
  const a1 = allele1.trim().toUpperCase();
  const a2 = allele2.trim().toUpperCase();

  // Handle no-call (represented as 0 or - in some AncestryDNA files)
  if (a1 === '0' || a1 === '-' || a2 === '0' || a2 === '-') {
    return '--';
  }

  // Validate each allele is a single nucleotide
  if (!/^[ACGT]$/.test(a1) || !/^[ACGT]$/.test(a2)) {
    // Handle insertions/deletions
    if (/^[DI]$/.test(a1) && /^[DI]$/.test(a2)) {
      return a1 + a2;
    }
    return null;
  }

  // Combine alleles (alphabetical order for consistency)
  return a1 + a2;
}
