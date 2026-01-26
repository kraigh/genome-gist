#!/usr/bin/env node
/**
 * GenomeGist CLI
 *
 * Command-line interface for testing the SNP extraction pipeline.
 *
 * Usage:
 *   npx tsx src/cli/index.ts <genome-file> [options]
 *
 * Options:
 *   --format=detailed|compact|minimal  Output format (default: detailed)
 *   --categories=wellness|full|all     Category preset (default: wellness)
 *   --output=<file>                    Write to file instead of stdout
 *   --json                             Output as JSON instead of YAML
 *   --quiet                            Suppress info messages
 */

import { writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadFreeSNPListFromFS, readGenomeFile } from './fs-loader';
import { parseGenomeFile, formatDisplayName } from '../parser';
import { extractVariants } from '../extractor';
import { toYAML, generateFilename, calculateSize } from '../output';
import { VERSION, TOOL_NAME } from '../version';
import { CATEGORY_PRESETS, ALL_CATEGORIES } from '../types';
import type { OutputFormat, SNPCategory, CategoryPreset } from '../types';

// Get the project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..', '..');

interface CLIOptions {
  genomePath: string;
  format: OutputFormat;
  categories: SNPCategory[];
  outputPath: string | null;
  asJson: boolean;
  quiet: boolean;
}

function log(message: string, quiet: boolean): void {
  if (!quiet) {
    console.error(message);
  }
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    genomePath: '',
    format: 'detailed',
    categories: CATEGORY_PRESETS.wellness,
    outputPath: null,
    asJson: false,
    quiet: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--format=')) {
      const format = arg.slice(9);
      if (format === 'detailed' || format === 'compact' || format === 'minimal') {
        options.format = format;
      } else {
        throw new Error(`Invalid format: ${format}. Must be: detailed, compact, or minimal`);
      }
    } else if (arg.startsWith('--categories=')) {
      const preset = arg.slice(13);
      if (preset === 'wellness' || preset === 'full') {
        options.categories = CATEGORY_PRESETS[preset as CategoryPreset];
      } else if (preset === 'all') {
        options.categories = ALL_CATEGORIES;
      } else {
        throw new Error(`Invalid categories: ${preset}. Must be: wellness, full, or all`);
      }
    } else if (arg.startsWith('--output=')) {
      options.outputPath = arg.slice(9);
    } else if (arg === '--json') {
      options.asJson = true;
    } else if (arg === '--quiet' || arg === '-q') {
      options.quiet = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--version' || arg === '-v') {
      console.log(`${TOOL_NAME} v${VERSION}`);
      process.exit(0);
    } else if (!arg.startsWith('-') && !options.genomePath) {
      options.genomePath = arg;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!options.genomePath) {
    throw new Error('No genome file specified. Run with --help for usage.');
  }

  return options;
}

const DEV_TOOL_NOTICE = `NOTE: This is a development/testing tool that uses the free SNP list only (~${18} variants).
      The full GenomeGist service includes 1,000+ curated variants.`;

function printHelp(): void {
  console.log(`
${TOOL_NAME} CLI v${VERSION}

${DEV_TOOL_NOTICE}

Extract clinically relevant SNPs from genome files.

Usage:
  npm run cli -- <genome-file> [options]

Arguments:
  <genome-file>    Path to the genome file (23andMe .txt format)

Options:
  --format=FORMAT       Output format: detailed, compact, minimal (default: detailed)
  --categories=PRESET   Category preset: wellness, full, all (default: wellness)
  --output=FILE         Write output to file instead of stdout
  --json                Output extraction result as JSON instead of YAML
  --quiet, -q           Suppress informational messages
  --help, -h            Show this help message
  --version, -v         Show version

Examples:
  # Extract with default settings (wellness categories, detailed format)
  npm run cli -- data/genome_file.txt

  # Extract all categories in compact format
  npm run cli -- data/genome_file.txt --categories=full --format=compact

  # Save output to file
  npm run cli -- data/genome_file.txt --output=results.yaml

  # Get JSON output for programmatic use
  npm run cli -- data/genome_file.txt --json --quiet
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printHelp();
    process.exit(1);
  }

  let options: CLIOptions;
  try {
    options = parseArgs(args);
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  const { genomePath, format, categories, outputPath, asJson, quiet } = options;

  try {
    // Show dev tool notice
    log(`\n${DEV_TOOL_NOTICE}\n`, quiet);

    // Load SNP list
    log(`Loading SNP list...`, quiet);
    const snpList = await loadFreeSNPListFromFS(PROJECT_ROOT);
    log(`Loaded SNP list v${snpList.version} with ${snpList.count} variants`, quiet);

    // Read genome file
    log(`Reading genome file: ${genomePath}`, quiet);
    const genomeContent = await readGenomeFile(resolve(genomePath));
    log(`Read ${(genomeContent.length / 1024 / 1024).toFixed(1)} MB`, quiet);

    // Parse genome file
    log(`Parsing genome file...`, quiet);
    const parseResult = parseGenomeFile(genomeContent);
    log(
      `Detected format: ${formatDisplayName(parseResult.format)} with ${parseResult.variants.length.toLocaleString()} variants`,
      quiet
    );

    // Extract variants
    log(`Extracting variants (${categories.length} categories)...`, quiet);
    const extractionResult = extractVariants(parseResult, snpList, categories);
    const { found, noCall, missing, total } = extractionResult.summary;
    log(`Found ${found} of ${total} variants (${noCall} no-call, ${missing} missing)`, quiet);

    // Generate output
    let output: string;
    if (asJson) {
      output = JSON.stringify(extractionResult, null, 2);
    } else {
      output = toYAML(extractionResult, format);
    }

    // Output results
    if (outputPath) {
      await writeFile(outputPath, output, 'utf-8');
      log(`Wrote ${calculateSize(output)} to ${outputPath}`, quiet);
    } else {
      // Write output to stdout
      console.log(output);
    }

    // Print summary to stderr if writing to stdout (so it doesn't mix with output)
    if (!outputPath && !quiet) {
      const filename = generateFilename(format);
      console.error(`\n---`);
      console.error(`Suggested filename: ${filename}`);
      console.error(`Output size: ${calculateSize(output)}`);
    }
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

main();
