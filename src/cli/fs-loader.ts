/**
 * File system loader for CLI
 *
 * Provides Node.js-compatible versions of loaders that use fs instead of fetch.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { SNPList } from '../types';
import { validateSNPList } from '../snp-list/validation';

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
