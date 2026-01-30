/**
 * SNP List Validation
 *
 * Shared validation logic for SNP lists, used by both browser and CLI loaders.
 */

import type { SNPList, SNPEntry } from '../types';
import { ALL_CATEGORIES } from '../types';

/**
 * Validate that loaded data matches expected SNPList structure
 */
export function validateSNPList(data: unknown): SNPList {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid SNP list: expected an object');
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.version !== 'string') {
    throw new Error('Invalid SNP list: missing version');
  }

  if (!Array.isArray(obj.variants)) {
    throw new Error('Invalid SNP list: missing variants array');
  }

  // Validate each variant has required fields
  for (const variant of obj.variants) {
    validateSNPEntry(variant);
  }

  // Validate count field matches array length if provided
  const actualCount = obj.variants.length;
  if (typeof obj.count === 'number' && obj.count !== actualCount) {
    console.warn(
      `SNP list count mismatch: JSON says ${obj.count}, but array has ${actualCount} entries`
    );
  }

  return {
    version: obj.version,
    generatedAt: typeof obj.generatedAt === 'string' ? obj.generatedAt : new Date().toISOString(),
    count: actualCount,
    variants: obj.variants as SNPEntry[],
  };
}

/**
 * Validate a single SNP entry
 */
export function validateSNPEntry(entry: unknown): asserts entry is SNPEntry {
  if (!entry || typeof entry !== 'object') {
    throw new Error('Invalid SNP entry: expected an object');
  }

  const obj = entry as Record<string, unknown>;

  if (typeof obj.rsid !== 'string' || !obj.rsid.startsWith('rs')) {
    throw new Error(`Invalid SNP entry: invalid rsid "${obj.rsid}"`);
  }

  if (typeof obj.gene !== 'string') {
    throw new Error(`Invalid SNP entry: missing gene for ${obj.rsid}`);
  }

  if (typeof obj.category !== 'string') {
    throw new Error(`Invalid SNP entry: missing category for ${obj.rsid}`);
  }

  // Validate category is a known value using ALL_CATEGORIES from types.ts
  if (!ALL_CATEGORIES.includes(obj.category as typeof ALL_CATEGORIES[number])) {
    throw new Error(`Invalid SNP entry: unknown category "${obj.category}" for ${obj.rsid}`);
  }

  if (typeof obj.annotation !== 'string') {
    throw new Error(`Invalid SNP entry: missing annotation for ${obj.rsid}`);
  }

  if (!Array.isArray(obj.sources)) {
    throw new Error(`Invalid SNP entry: missing sources for ${obj.rsid}`);
  }

  // Validate sources are all strings
  if (!obj.sources.every((s) => typeof s === 'string')) {
    throw new Error(`Invalid SNP entry: sources must be array of strings for ${obj.rsid}`);
  }
}
