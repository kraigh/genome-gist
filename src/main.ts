/**
 * GenomeGist - Main entry point
 */

import { parseGenomeFile, formatDisplayName } from './parser';
import { loadFreeSNPList } from './snp-list';
import { extractVariants, estimateMatches } from './extractor';
import { toYAML, generateFilename, calculateSize } from './output';
import type {
  SNPList,
  ExtractionResult,
  OutputFormat,
  ParseResult,
  SNPCategory,
  CategoryPreset,
} from './types';
import {
  ParseError,
  ALL_CATEGORIES,
  CATEGORY_PRESETS,
  CATEGORY_LABELS,
} from './types';
import { VERSION, TOOL_NAME } from './version';

// localStorage keys
const FORMAT_STORAGE_KEY = 'genomegist-output-format';
const PRESET_STORAGE_KEY = 'genomegist-category-preset';

/**
 * Safely get a DOM element by ID with type checking
 * @throws Error if element is not found
 */
function getElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Required DOM element #${id} not found. Check index.html.`);
  }
  return el as T;
}

// DOM elements (with null checks)
const uploadZone = getElement<HTMLDivElement>('upload-zone');
const fileInput = getElement<HTMLInputElement>('file-input');
const statusDiv = getElement<HTMLDivElement>('status');
const statusText = getElement<HTMLParagraphElement>('status-text');
const previewDiv = getElement<HTMLDivElement>('preview');
const detectedFormat = getElement<HTMLElement>('detected-format');
const variantCount = getElement<HTMLElement>('variant-count');
const estimateCount = getElement<HTMLElement>('estimate-count');
const categoryCheckboxes = getElement<HTMLDivElement>('category-checkboxes');
const backBtn = getElement<HTMLButtonElement>('back-btn');
const extractBtn = getElement<HTMLButtonElement>('extract-btn');
const resultsDiv = getElement<HTMLDivElement>('results');
const resultsSummary = getElement<HTMLParagraphElement>('results-summary');
const downloadBtn = getElement<HTMLButtonElement>('download-btn');
const fileSizeSpan = getElement<HTMLSpanElement>('file-size');
const errorDiv = getElement<HTMLDivElement>('error');
const errorText = getElement<HTMLParagraphElement>('error-text');

// State
let currentParseResult: ParseResult | null = null;
let currentResult: ExtractionResult | null = null;
let snpList: SNPList | null = null;
let currentReader: FileReader | null = null;
let selectedFormat: OutputFormat = 'detailed';
let selectedCategories: SNPCategory[] = CATEGORY_PRESETS.wellness;
let currentPreset: CategoryPreset = 'wellness';

// Initialize
async function init(): Promise<void> {
  // Restore format preference
  const savedFormat = localStorage.getItem(FORMAT_STORAGE_KEY);
  if (savedFormat && isValidFormat(savedFormat)) {
    selectedFormat = savedFormat;
    setFormatRadio(savedFormat);
  }

  // Restore category preset preference
  const savedPreset = localStorage.getItem(PRESET_STORAGE_KEY);
  if (savedPreset && isValidPreset(savedPreset)) {
    currentPreset = savedPreset;
    selectedCategories = CATEGORY_PRESETS[savedPreset];
    setPresetRadio(savedPreset);
  }

  // Set up format change listeners
  const formatInputs = document.querySelectorAll<HTMLInputElement>('input[name="output-format"]');
  formatInputs.forEach((input) => {
    input.addEventListener('change', () => {
      if (isValidFormat(input.value)) {
        selectedFormat = input.value;
        localStorage.setItem(FORMAT_STORAGE_KEY, selectedFormat);
        updateOutputPreview();
      }
    });
  });

  // Set up preset change listeners
  const presetInputs = document.querySelectorAll<HTMLInputElement>('input[name="category-preset"]');
  presetInputs.forEach((input) => {
    input.addEventListener('change', () => {
      if (isValidPreset(input.value)) {
        currentPreset = input.value;
        selectedCategories = CATEGORY_PRESETS[input.value];
        localStorage.setItem(PRESET_STORAGE_KEY, currentPreset);
        updateCategoryCheckboxes();
        updateEstimate();
      }
    });
  });

  // Generate category checkboxes
  generateCategoryCheckboxes();

  try {
    showStatus('Loading SNP list...');
    snpList = await loadFreeSNPList();
    hideStatus();
    console.log(`${TOOL_NAME} v${VERSION} loaded. SNP list v${snpList.version} with ${snpList.count} variants.`);
  } catch (err) {
    showError('Failed to load SNP list. Please refresh the page.');
    console.error('Failed to load SNP list:', err);
  }
}

function isValidFormat(value: string): value is OutputFormat {
  return value === 'detailed' || value === 'compact' || value === 'minimal';
}

function isValidPreset(value: string): value is CategoryPreset {
  return value === 'wellness' || value === 'full';
}

function setFormatRadio(format: OutputFormat): void {
  const input = document.querySelector<HTMLInputElement>(`input[name="output-format"][value="${format}"]`);
  if (input) {
    input.checked = true;
  }
}

function setPresetRadio(preset: CategoryPreset): void {
  const input = document.querySelector<HTMLInputElement>(`input[name="category-preset"][value="${preset}"]`);
  if (input) {
    input.checked = true;
  }
}

// Generate category checkboxes dynamically
function generateCategoryCheckboxes(): void {
  categoryCheckboxes.innerHTML = '';

  for (const category of ALL_CATEGORIES) {
    const label = CATEGORY_LABELS[category];
    const isChecked = selectedCategories.includes(category);

    const wrapper = document.createElement('label');
    wrapper.className = 'category-checkbox';

    wrapper.innerHTML = `
      <input type="checkbox" value="${category}" ${isChecked ? 'checked' : ''} />
      <span class="category-checkbox-label">
        <span class="category-checkbox-name">${label.name}</span>
        <span class="category-checkbox-desc">${label.description}</span>
      </span>
    `;

    const checkbox = wrapper.querySelector('input');
    checkbox?.addEventListener('change', handleCategoryCheckboxChange);

    categoryCheckboxes.appendChild(wrapper);
  }
}

function handleCategoryCheckboxChange(): void {
  // Gather all checked categories
  const checkboxes = categoryCheckboxes.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
  selectedCategories = [];

  checkboxes.forEach((cb) => {
    if (cb.checked) {
      selectedCategories.push(cb.value as SNPCategory);
    }
  });

  // Clear preset radio (custom selection)
  const presetInputs = document.querySelectorAll<HTMLInputElement>('input[name="category-preset"]');
  presetInputs.forEach((input) => {
    input.checked = false;
  });

  updateEstimate();
}

function updateCategoryCheckboxes(): void {
  const checkboxes = categoryCheckboxes.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
  checkboxes.forEach((cb) => {
    cb.checked = selectedCategories.includes(cb.value as SNPCategory);
  });
}

// UI Helpers
function showStatus(message: string): void {
  statusDiv.hidden = false;
  statusText.textContent = message;
  previewDiv.hidden = true;
  resultsDiv.hidden = true;
  errorDiv.hidden = true;
}

function hideStatus(): void {
  statusDiv.hidden = true;
}

function showPreview(parseResult: ParseResult): void {
  statusDiv.hidden = true;
  previewDiv.hidden = false;
  resultsDiv.hidden = true;
  errorDiv.hidden = true;
  uploadZone.hidden = true;

  currentParseResult = parseResult;

  // Display format and variant count
  detectedFormat.textContent = formatDisplayName(parseResult.format);
  variantCount.textContent = parseResult.variants.length.toLocaleString();

  // Update estimate
  updateEstimate();
}

function updateEstimate(): void {
  if (!currentParseResult || !snpList) return;

  const estimate = estimateMatches(currentParseResult, snpList, selectedCategories);
  estimateCount.textContent = estimate.total.toString();
}

function showResults(result: ExtractionResult): void {
  statusDiv.hidden = true;
  previewDiv.hidden = true;
  resultsDiv.hidden = false;
  errorDiv.hidden = true;

  currentResult = result;

  const { found, noCall, missing, total } = result.summary;
  const format = formatDisplayName(result.metadata.sourceFormat);

  let summaryText = `Found ${found} of ${total} variants`;
  if (noCall > 0) {
    summaryText += ` (${noCall} no-call)`;
  }
  if (missing > 0) {
    summaryText += `, ${missing} not in file`;
  }
  summaryText += `. Source: ${format}.`;

  resultsSummary.textContent = summaryText;

  // Update file size display
  updateOutputPreview();
}

function updateOutputPreview(): void {
  if (!currentResult) return;

  const output = toYAML(currentResult, selectedFormat);
  const fileSize = calculateSize(output);

  fileSizeSpan.textContent = fileSize;
  downloadBtn.textContent = 'Download Results';
}

function showError(message: string): void {
  statusDiv.hidden = true;
  previewDiv.hidden = true;
  resultsDiv.hidden = true;
  errorDiv.hidden = false;
  errorText.textContent = message;
}

function resetToUpload(): void {
  currentParseResult = null;
  currentResult = null;

  statusDiv.hidden = true;
  previewDiv.hidden = true;
  resultsDiv.hidden = true;
  errorDiv.hidden = true;
  uploadZone.hidden = false;
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

  // Abort any in-progress file read to prevent race conditions
  if (currentReader) {
    currentReader.abort();
  }

  const reader = new FileReader();
  currentReader = reader;

  reader.onload = (e) => {
    // Ignore if this reader was superseded by a new one
    if (currentReader !== reader) return;
    const content = e.target?.result as string;
    if (!content) {
      showError('Failed to read file content.');
      return;
    }

    parseAndShowPreview(content);
  };

  reader.onerror = () => {
    showError('Failed to read file. Please try again.');
  };

  reader.readAsText(file);
}

// Parse genome file and show preview (Step 1)
function parseAndShowPreview(content: string): void {
  if (!snpList) {
    showError('SNP list not loaded. Please refresh the page.');
    return;
  }

  try {
    showStatus('Parsing genome file...');
    const parseResult = parseGenomeFile(content);

    // Show preview instead of immediately extracting
    showPreview(parseResult);
  } catch (err) {
    // Handle parse errors
    if (err instanceof ParseError) {
      let errorMessage = err.message;
      if (err.details) {
        errorMessage += ` ${err.details}`;
      }
      showError(errorMessage);
    } else if (err instanceof Error) {
      showError(err.message || 'Failed to process file.');
    } else {
      showError('An unexpected error occurred. Please try again.');
    }
    console.error('Processing error:', err);
  }
}

// Perform extraction with selected categories (Step 2)
function performExtraction(): void {
  if (!currentParseResult || !snpList) {
    showError('No file loaded. Please upload a genome file first.');
    return;
  }

  try {
    showStatus('Extracting variants...');

    // Extract matching variants with category filter
    const extractionResult = extractVariants(currentParseResult, snpList, selectedCategories);

    // Show results
    showStatus('Processing complete.');
    showResults(extractionResult);
  } catch (err) {
    if (err instanceof Error) {
      showError(err.message || 'Failed to extract variants.');
    } else {
      showError('An unexpected error occurred. Please try again.');
    }
    console.error('Extraction error:', err);
  }
}

// Download handler
function downloadResults(): void {
  if (!currentResult) return;

  const output = toYAML(currentResult, selectedFormat);
  const mimeType = selectedFormat === 'minimal' ? 'text/csv' : 'text/yaml';
  const blob = new Blob([output], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const filename = generateFilename(selectedFormat);

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

// Preview action buttons
backBtn.addEventListener('click', resetToUpload);
extractBtn.addEventListener('click', performExtraction);

// Download button
downloadBtn.addEventListener('click', downloadResults);

// Prevent default drag behavior on document
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

// Initialize on load
init();
