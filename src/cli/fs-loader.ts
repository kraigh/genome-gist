/**
 * File system loader for CLI
 *
 * Provides Node.js-compatible versions of loaders that use fs instead of fetch.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { SNPList, SNPEntry } from '../types';

/**
 * Load the free tier SNP list from file system
 */
export async function loadFreeSNPListFromFS(basePath: string): Promise<SNPList> {
  const listPath = resolve(basePath, 'public', 'snp-list-free.json');

  let content: string;
  try {
    content = await readFile(listPath, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to read SNP list from ${listPath}: ${err}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    throw new Error('Failed to parse SNP list: invalid JSON format');
  }

  return validateSNPList(data);
}

/**
 * Read a genome file from the file system
 */
export async function readGenomeFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to read genome file from ${filePath}: ${err}`);
  }
}

// Valid category values
const VALID_CATEGORIES = [
  'methylation',
  'detoxification',
  'cardiovascular',
  'pharmacogenomics',
  'neurotransmitters',
  'immune',
  'nutrition',
  'other',
];

/**
 * Validate that loaded data matches expected SNPList structure
 */
function validateSNPList(data: unknown): SNPList {
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
function validateSNPEntry(entry: unknown): asserts entry is SNPEntry {
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

  if (!VALID_CATEGORIES.includes(obj.category)) {
    throw new Error(`Invalid SNP entry: unknown category "${obj.category}" for ${obj.rsid}`);
  }

  if (typeof obj.annotation !== 'string') {
    throw new Error(`Invalid SNP entry: missing annotation for ${obj.rsid}`);
  }

  if (!Array.isArray(obj.sources)) {
    throw new Error(`Invalid SNP entry: missing sources for ${obj.rsid}`);
  }

  if (!obj.sources.every((s) => typeof s === 'string')) {
    throw new Error(`Invalid SNP entry: sources must be array of strings for ${obj.rsid}`);
  }
}
