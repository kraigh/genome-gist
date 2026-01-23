/**
 * GenomeGist - Main entry point
 * Version 1.0.0
 */

import { parseGenomeFile, formatDisplayName } from './parser';
import { loadFreeSNPList } from './snp-list';
import { extractVariants } from './extractor';
import { toYAML, generateFilename, calculateSize } from './output';
import type { SNPList, ExtractionResult, ParseError } from './types';

// DOM elements
const uploadZone = document.getElementById('upload-zone') as HTMLDivElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const statusDiv = document.getElementById('status') as HTMLDivElement;
const statusText = document.getElementById('status-text') as HTMLParagraphElement;
const resultsDiv = document.getElementById('results') as HTMLDivElement;
const resultsSummary = document.getElementById('results-summary') as HTMLParagraphElement;
const downloadBtn = document.getElementById('download-btn') as HTMLButtonElement;
const errorDiv = document.getElementById('error') as HTMLDivElement;
const errorText = document.getElementById('error-text') as HTMLParagraphElement;

// State
let currentYAML: string | null = null;
let snpList: SNPList | null = null;

// Initialize
async function init(): Promise<void> {
  try {
    showStatus('Loading SNP list...');
    snpList = await loadFreeSNPList();
    hideStatus();
    console.log(`GenomeGist v1.0.0 loaded. SNP list v${snpList.version} with ${snpList.count} variants.`);
  } catch (err) {
    showError('Failed to load SNP list. Please refresh the page.');
    console.error('Failed to load SNP list:', err);
  }
}

// UI Helpers
function showStatus(message: string): void {
  statusDiv.hidden = false;
  statusText.textContent = message;
  resultsDiv.hidden = true;
  errorDiv.hidden = true;
}

function hideStatus(): void {
  statusDiv.hidden = true;
}

function showResults(result: ExtractionResult, yamlContent: string): void {
  statusDiv.hidden = true;
  resultsDiv.hidden = false;
  errorDiv.hidden = true;

  const { found, noCall, missing, total } = result.summary;
  const fileSize = calculateSize(yamlContent);
  const format = formatDisplayName(result.metadata.sourceFormat);

  let summaryText = `Found ${found} of ${total} variants`;
  if (noCall > 0) {
    summaryText += ` (${noCall} no-call)`;
  }
  if (missing > 0) {
    summaryText += `, ${missing} not in file`;
  }
  summaryText += `. Source: ${format}. Download size: ${fileSize}`;

  resultsSummary.textContent = summaryText;
  currentYAML = yamlContent;

  // Update download button text with size
  downloadBtn.textContent = `Download Results (${fileSize})`;
}

function showError(message: string): void {
  statusDiv.hidden = true;
  resultsDiv.hidden = true;
  errorDiv.hidden = false;
  errorText.textContent = message;
}

// File handling
function handleFile(file: File): void {
  if (!file) return;

  if (!snpList) {
    showError('SNP list not loaded. Please refresh the page.');
    return;
  }

  // Basic validation
  const validExtensions = ['.txt', '.csv'];
  const hasValidExtension = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

  if (!hasValidExtension) {
    showError('Unsupported file format. Please upload a .txt file from 23andMe.');
    return;
  }

  // Check file size (warn if very large)
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    showError('File is too large. Maximum size is 100MB.');
    return;
  }

  showStatus(`Reading ${file.name}...`);

  const reader = new FileReader();

  reader.onload = (e) => {
    const content = e.target?.result as string;
    if (!content) {
      showError('Failed to read file content.');
      return;
    }

    processGenomeFile(content);
  };

  reader.onerror = () => {
    showError('Failed to read file. Please try again.');
  };

  reader.readAsText(file);
}

// Process genome file
function processGenomeFile(content: string): void {
  if (!snpList) {
    showError('SNP list not loaded. Please refresh the page.');
    return;
  }

  try {
    // Parse the genome file
    showStatus('Parsing genome file...');
    const parseResult = parseGenomeFile(content);

    showStatus(
      `Parsed ${parseResult.variants.length.toLocaleString()} variants. Matching against SNP list...`
    );

    // Extract matching variants
    const extractionResult = extractVariants(parseResult, snpList);

    // Generate YAML output
    showStatus('Generating output...');
    const yamlContent = toYAML(extractionResult);

    // Show results
    showResults(extractionResult, yamlContent);
  } catch (err) {
    // Handle parse errors
    const parseError = err as ParseError;
    let errorMessage = parseError.message || 'Failed to process file.';

    if (parseError.details) {
      errorMessage += ` ${parseError.details}`;
    }

    showError(errorMessage);
    console.error('Processing error:', err);
  }
}

// Download handler
function downloadResults(): void {
  if (!currentYAML) return;

  const blob = new Blob([currentYAML], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const filename = generateFilename();

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Event listeners
uploadZone.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) {
    handleFile(file);
  }
  // Reset input so same file can be selected again
  fileInput.value = '';
});

// Drag and drop
uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('drag-over');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');

  const file = e.dataTransfer?.files[0];
  if (file) {
    handleFile(file);
  }
});

downloadBtn.addEventListener('click', downloadResults);

// Prevent default drag behavior on document
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

// Initialize on load
init();
