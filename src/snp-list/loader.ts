/**
 * SNP List Loader
 *
 * Handles loading the SNP list from bundled JSON (free tier)
 * or from the API (paid tier).
 */

import type { SNPList } from '../types';
import { validateSNPList } from './validation';

// Free tier SNP list is bundled with the app
const FREE_LIST_URL = '/snp-list-free.json';

/**
 * Load the free tier SNP list (bundled with app)
 */
export async function loadFreeSNPList(): Promise<SNPList> {
  const response = await fetch(FREE_LIST_URL);

  if (!response.ok) {
    throw new Error(`Failed to load SNP list: ${response.status} ${response.statusText}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('Failed to parse SNP list: invalid JSON format');
  }

  return validateSNPList(data);
}

// Re-export validation for use by decryption module
export { validateSNPList } from './validation';
