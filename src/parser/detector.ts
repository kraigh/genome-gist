/**
 * Format detection for genome files
 */

import type { GenomeFormat } from '../types';

/**
 * Detect the format of a genome file from its content
 */
export function detectFormat(content: string): GenomeFormat {
  const firstLines = content.slice(0, 2000); // Check first ~2KB

  // 23andMe format detection
  if (is23andMe(firstLines)) {
    return detect23andMeVersion(firstLines);
  }

  // AncestryDNA format detection
  if (isAncestry(firstLines)) {
    return 'ancestry';
  }

  return 'unknown';
}

/**
 * Check if content appears to be from 23andMe
 */
function is23andMe(header: string): boolean {
  // 23andMe files have distinctive header comments
  return (
    header.includes('23andMe') ||
    header.includes('# rsid\tchromosome\tposition\tgenotype')
  );
}

/**
 * Detect specific 23andMe version from header
 */
function detect23andMeVersion(header: string): GenomeFormat {
  // v5 uses build 37 and has specific header format
  if (header.includes('build 37') || header.includes('Annotation Release 104')) {
    return '23andme-v5';
  }

  // v4 typically mentions build 37 but different annotation
  if (header.includes('build 36')) {
    return '23andme-v3';
  }

  // Default to v5 for recent 23andMe files
  if (header.includes('23andMe')) {
    return '23andme-v5';
  }

  return '23andme-v5'; // Assume v5 if 23andMe-like but version unclear
}

/**
 * Check if content appears to be from AncestryDNA
 */
function isAncestry(header: string): boolean {
  return (
    header.includes('AncestryDNA') ||
    header.includes('rsid\tchromosome\tposition\tallele1\tallele2')
  );
}

/**
 * Get human-readable format name
 */
export function formatDisplayName(format: GenomeFormat): string {
  switch (format) {
    case '23andme-v5':
      return '23andMe (v5)';
    case '23andme-v4':
      return '23andMe (v4)';
    case '23andme-v3':
      return '23andMe (v3)';
    case 'ancestry':
      return 'AncestryDNA';
    case 'unknown':
      return 'Unknown format';
  }
}
