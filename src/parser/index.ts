/**
 * Parser module - main entry point
 */

export { detectFormat, formatDisplayName } from './detector';
export { parse23andMe } from './23andme';
export { parseAncestry } from './ancestry';

import type { ParseResult } from '../types';
import { ParseError } from '../types';
import { detectFormat } from './detector';
import { parse23andMe } from './23andme';
import { parseAncestry } from './ancestry';

/**
 * Parse a genome file, auto-detecting format
 * @param content Raw file content
 * @returns ParseResult with variants and metadata
 * @throws Error if format is unsupported or parsing fails
 */
export function parseGenomeFile(content: string): ParseResult {
  const format = detectFormat(content);

  switch (format) {
    case '23andme-v5':
    case '23andme-v4':
    case '23andme-v3': {
      const result = parse23andMe(content);
      // Use the detected format, not the hardcoded one from the parser
      result.format = format;
      return result;
    }

    case 'ancestry':
      return parseAncestry(content);

    case 'unknown':
      throw createUnsupportedFormatError(
        'Unable to detect file format. Please upload a raw data file from 23andMe or AncestryDNA.'
      );
  }
}

function createUnsupportedFormatError(message: string): ParseError {
  return new ParseError(message, undefined, 'Supported formats: 23andMe (.txt), AncestryDNA (.txt)');
}
