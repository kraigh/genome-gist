/**
 * GenomeGist - Main entry point
 */

import { parseGenomeFile, formatDisplayName } from './parser';
import { loadFreeSNPList, validateSNPList } from './snp-list';
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
  PRESET_REQUIRES_TOKEN,
} from './types';
import { VERSION, TOOL_NAME } from './version';
import { initializeLemonSqueezy, openCheckout, isLemonSqueezyConfigured } from './lemon-squeezy';

// localStorage keys
const FORMAT_STORAGE_KEY = 'genomegist-output-format';
const PRESET_STORAGE_KEY = 'genomegist-category-preset';
const TOKEN_STORAGE_KEY = 'genomegist-token';

// API configuration
const API_BASE_URL = 'https://api.genomegist.com';

/**
 * Decrypt the paid SNP list using the token as the key
 * Uses AES-256-GCM with SHA-256(token) as the key
 */
async function decryptSnpList(
  encryptedBase64: string,
  ivBase64: string,
  token: string
): Promise<SNPList> {
  // Decode base64 first (can throw on invalid input)
  let encrypted: Uint8Array<ArrayBuffer>;
  let iv: Uint8Array<ArrayBuffer>;
  try {
    encrypted = new Uint8Array(
      atob(encryptedBase64)
        .split('')
        .map((c) => c.charCodeAt(0))
    );
    iv = new Uint8Array(
      atob(ivBase64)
        .split('')
        .map((c) => c.charCodeAt(0))
    );
  } catch (err) {
    console.error('Failed to decode encrypted SNP list:', err);
    throw new Error('Failed to decrypt SNP data. The data may be corrupted.');
  }

  // Derive key from token (same as server)
  const encoder = new TextEncoder();
  const tokenBytes = encoder.encode(token);
  const keyMaterial = await crypto.subtle.digest('SHA-256', tokenBytes);
  const key = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  // Decrypt
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);

  // Parse and validate the decrypted JSON
  const data = JSON.parse(new TextDecoder().decode(decrypted));
  return validateSNPList(data);
}

interface CheckLicenseResult {
  valid: boolean;
  sessionsRemaining?: number;
  hasActiveSession?: boolean;
  sessionExpiresAt?: string;
  error?: string;
}

/**
 * Check if a license key is valid WITHOUT consuming a session
 * Used for initial validation on page load and when user enters a key
 */
async function checkLicense(licenseKey: string): Promise<CheckLicenseResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/check-license`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey }),
    });

    if (!response.ok) {
      console.error('License check HTTP error:', response.status);
      return { valid: false, error: 'network_error' };
    }

    return await response.json();
  } catch (err) {
    console.error('License check error:', err);
    return { valid: false, error: 'network_error' };
  }
}

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

// DOM elements - Upload section
const uploadZone = getElement<HTMLDivElement>('upload-zone');
const fileInput = getElement<HTMLInputElement>('file-input');

// DOM elements - Status section
const statusDiv = getElement<HTMLDivElement>('status');
const statusText = getElement<HTMLParagraphElement>('status-text');

// DOM elements - Preview section
const previewDiv = getElement<HTMLDivElement>('preview');
const detectedFormat = getElement<HTMLElement>('detected-format');
const variantCount = getElement<HTMLElement>('variant-count');
const estimateCount = getElement<HTMLElement>('estimate-count');
const categoryCheckboxes = getElement<HTMLDivElement>('category-checkboxes');
const backBtn = getElement<HTMLButtonElement>('back-btn');
const extractBtn = getElement<HTMLButtonElement>('extract-btn');

// DOM elements - Token section
const tokenSection = getElement<HTMLDivElement>('token-section');
const tokenInput = getElement<HTMLInputElement>('token-input');
const tokenValidateBtn = getElement<HTMLButtonElement>('token-validate-btn');
const tokenStatus = getElement<HTMLDivElement>('token-status');
const tokenActive = getElement<HTMLDivElement>('token-active');
const licenseStatusText = getElement<HTMLSpanElement>('license-status-text');
const sessionInfo = getElement<HTMLSpanElement>('session-info');
const tokenClearBtn = getElement<HTMLButtonElement>('token-clear-btn');
const purchaseLink = getElement<HTMLAnchorElement>('purchase-link');
const purchaseSuccessBanner = getElement<HTMLDivElement>('purchase-success-banner');
const dismissSuccessBanner = getElement<HTMLButtonElement>('dismiss-success-banner');

// DOM elements - Results section
const resultsDiv = getElement<HTMLDivElement>('results');
const resultsSummary = getElement<HTMLParagraphElement>('results-summary');
const downloadBtn = getElement<HTMLButtonElement>('download-btn');
const fileSizeSpan = getElement<HTMLSpanElement>('file-size');

// DOM elements - Error section
const errorDiv = getElement<HTMLDivElement>('error');
const errorText = getElement<HTMLParagraphElement>('error-text');

// DOM elements - Footer
const versionText = getElement<HTMLSpanElement>('version-text');

// State
let currentParseResult: ParseResult | null = null;
let currentResult: ExtractionResult | null = null;
let snpList: SNPList | null = null;
let paidSnpList: SNPList | null = null; // Decrypted paid SNP list (kept in closure)
let currentReader: FileReader | null = null;
let selectedFormat: OutputFormat = 'detailed';
let selectedCategories: SNPCategory[] = CATEGORY_PRESETS.demo;
let currentPreset: CategoryPreset = 'demo';
let storedToken: string | null = null;
let sessionsRemaining: number | null = null;
let sessionExpiresAt: Date | null = null;
let hasActiveSession = false; // Whether there's an active 24h session (from check-license)
let licenseValidated = false; // Whether license has been validated (without consuming session)
let tokenTimeoutId: ReturnType<typeof setTimeout> | null = null;

// Initialize
async function init(): Promise<void> {
  // Set version in footer
  versionText.textContent = `${TOOL_NAME} v${VERSION}`;

  // Set up dismiss button for success banner
  dismissSuccessBanner.addEventListener('click', () => {
    purchaseSuccessBanner.hidden = true;
  });

  // Check for URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const urlLicenseKey = urlParams.get('license_key');
  const isPurchaseSuccess = urlParams.get('purchase') === 'success';

  // Clean up URL without reloading the page
  if (urlLicenseKey || isPurchaseSuccess) {
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, cleanUrl);
  }

  // Handle license key from URL (email link or purchase redirect)
  if (urlLicenseKey) {
    // Show purchase success banner if coming from checkout
    if (isPurchaseSuccess) {
      purchaseSuccessBanner.hidden = false;
    }

    // Validate the license key (without consuming a session)
    showTokenStatus('Validating license key...', 'loading');
    const result = await checkLicense(urlLicenseKey);

    if (result.valid) {
      // Store the validated license key
      storedToken = urlLicenseKey;
      sessionsRemaining = result.sessionsRemaining ?? null;
      hasActiveSession = result.hasActiveSession ?? false;
      sessionExpiresAt = result.sessionExpiresAt ? new Date(result.sessionExpiresAt) : null;
      licenseValidated = true;
      localStorage.setItem(TOKEN_STORAGE_KEY, urlLicenseKey);

      tokenStatus.hidden = true;
      updateTokenUI();
    } else {
      // Show error for invalid/exhausted license
      const errorMsg = result.error === 'exhausted'
        ? 'This license key has no remaining sessions. Purchase a new key to continue.'
        : 'Invalid license key.';
      showTokenStatus(errorMsg, 'error');
      // Hide purchase success banner if license is invalid
      purchaseSuccessBanner.hidden = true;
    }
  } else {
    // Restore token from localStorage (if no URL param)
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (savedToken) {
      storedToken = savedToken;
      // Validate the stored license key in background
      const tokenBeingValidated = savedToken;
      checkLicense(savedToken).then((result) => {
        // Don't update state if token changed during validation (user cleared or entered new one)
        if (storedToken !== tokenBeingValidated) return;

        if (result.valid) {
          sessionsRemaining = result.sessionsRemaining ?? null;
          hasActiveSession = result.hasActiveSession ?? false;
          sessionExpiresAt = result.sessionExpiresAt ? new Date(result.sessionExpiresAt) : null;
          licenseValidated = true;
          updateTokenUI();
        } else {
          // Stored license is no longer valid, clear it
          clearToken();
        }
      });
      // Show as active while we verify
      updateTokenUI();
    }
  }

  // Restore format preference
  const savedFormat = localStorage.getItem(FORMAT_STORAGE_KEY);
  if (savedFormat && isValidFormat(savedFormat)) {
    selectedFormat = savedFormat;
    setFormatRadio(savedFormat);
  }

  // Restore category preset preference (but validate token requirement)
  const savedPreset = localStorage.getItem(PRESET_STORAGE_KEY);
  if (savedPreset && isValidPreset(savedPreset)) {
    // If saved preset requires token but no token stored, fall back to demo
    if (PRESET_REQUIRES_TOKEN[savedPreset] && !storedToken) {
      currentPreset = 'demo';
      selectedCategories = CATEGORY_PRESETS.demo;
      setPresetRadio('demo');
    } else {
      currentPreset = savedPreset;
      selectedCategories = CATEGORY_PRESETS[savedPreset];
      setPresetRadio(savedPreset);
    }
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
        handlePresetChange(input.value);
      }
    });
  });

  // Set up token event listeners
  tokenValidateBtn.addEventListener('click', handleTokenValidation);
  tokenInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleTokenValidation();
    }
  });
  tokenClearBtn.addEventListener('click', clearToken);
  purchaseLink.addEventListener('click', handlePurchaseClick);

  // Generate category checkboxes
  generateCategoryCheckboxes();

  // Update token section visibility based on initial preset
  updateTokenSectionVisibility();

  try {
    showStatus('Loading SNP list...');
    snpList = await loadFreeSNPList();
    hideStatus();
    if (import.meta.env.DEV) {
      console.log(`${TOOL_NAME} v${VERSION} loaded. SNP list v${snpList.version} with ${snpList.count} variants.`);
    }
  } catch (err) {
    showError('Failed to load SNP list. Please refresh the page.');
    console.error('Failed to load SNP list:', err);
  }

  // Initialize Lemon Squeezy for checkout (non-blocking)
  initializeLemonSqueezy().catch((err) => {
    console.warn('Lemon Squeezy initialization skipped:', err.message);
  });
}

// Handle preset selection changes
function handlePresetChange(preset: CategoryPreset): void {
  const requiresToken = PRESET_REQUIRES_TOKEN[preset];

  // If requires token and no valid token, show token section
  if (requiresToken && !storedToken) {
    // Still update the preset selection visually
    currentPreset = preset;
    selectedCategories = CATEGORY_PRESETS[preset];
    localStorage.setItem(PRESET_STORAGE_KEY, currentPreset);
    updateCategoryCheckboxes();
    updateTokenSectionVisibility();
    // Don't update estimate yet - they need to enter a token
    // Show estimate based on what they'd get with the paid tier
    updateEstimate();
    return;
  }

  currentPreset = preset;
  selectedCategories = CATEGORY_PRESETS[preset];
  localStorage.setItem(PRESET_STORAGE_KEY, currentPreset);
  updateCategoryCheckboxes();
  updateTokenSectionVisibility();
  updateEstimate();
}

// Update token section visibility based on current state
function updateTokenSectionVisibility(): void {
  const requiresToken = PRESET_REQUIRES_TOKEN[currentPreset];

  if (storedToken && licenseValidated) {
    // License key is stored and validated - show status badge
    tokenSection.hidden = true;
    tokenActive.hidden = false;

    // Update status text and session info based on state
    if (hasActiveSession && sessionExpiresAt) {
      const now = new Date();
      if (sessionExpiresAt > now) {
        const hoursLeft = Math.ceil((sessionExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));
        licenseStatusText.textContent = 'Session active';
        sessionInfo.textContent = `· Unlimited exports for ${hoursLeft}h`;
      } else {
        // Session expired, but license still valid
        licenseStatusText.textContent = 'License key applied';
        sessionInfo.textContent = sessionsRemaining !== null ? `· ${sessionsRemaining} sessions available` : '';
      }
    } else if (paidSnpList) {
      // Have SNP list cached (session started during this page load)
      licenseStatusText.textContent = 'Session active';
      if (sessionExpiresAt) {
        const now = new Date();
        const hoursLeft = Math.ceil((sessionExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));
        sessionInfo.textContent = `· Unlimited exports for ${hoursLeft}h`;
      } else {
        sessionInfo.textContent = '';
      }
    } else {
      // License validated but no active session yet
      licenseStatusText.textContent = 'License key applied';
      sessionInfo.textContent = sessionsRemaining !== null ? `· ${sessionsRemaining} sessions available` : '';
    }
  } else if (storedToken) {
    // Token stored but not yet validated - show as pending
    tokenSection.hidden = true;
    tokenActive.hidden = false;
    licenseStatusText.textContent = 'Verifying license...';
    sessionInfo.textContent = '';
  } else if (requiresToken) {
    // Paid tier selected but no token - show input section
    tokenSection.hidden = false;
    tokenActive.hidden = true;
  } else {
    // Free tier - hide both
    tokenSection.hidden = true;
    tokenActive.hidden = true;
  }
}

// Update token UI state
function updateTokenUI(): void {
  updateTokenSectionVisibility();
}

// Handle token validation (uses check-license, does NOT consume a session)
async function handleTokenValidation(): Promise<void> {
  const token = tokenInput.value.trim();

  if (!token) {
    showTokenStatus('Please enter a license key.', 'error');
    return;
  }

  // Basic validation - license keys should have some minimum length
  if (token.length < 8) {
    showTokenStatus('Invalid license key format.', 'error');
    return;
  }

  showTokenStatus('Validating license key...', 'loading');
  tokenValidateBtn.disabled = true;

  try {
    const result = await checkLicense(token);

    if (result.valid) {
      // Store the validated license key
      storedToken = token;
      sessionsRemaining = result.sessionsRemaining ?? null;
      hasActiveSession = result.hasActiveSession ?? false;
      sessionExpiresAt = result.sessionExpiresAt ? new Date(result.sessionExpiresAt) : null;
      licenseValidated = true;
      localStorage.setItem(TOKEN_STORAGE_KEY, token);

      // Build success message based on state
      let successMsg: string;
      if (hasActiveSession && sessionExpiresAt) {
        const hoursLeft = Math.ceil((sessionExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60));
        successMsg = `License key applied! Session active for ${hoursLeft}h.`;
      } else if (sessionsRemaining !== null) {
        successMsg = `License key applied! ${sessionsRemaining} sessions available.`;
      } else {
        successMsg = 'License key applied!';
      }
      showTokenStatus(successMsg, 'success');

      // Cancel any pending timeout to prevent race conditions
      if (tokenTimeoutId) {
        clearTimeout(tokenTimeoutId);
      }

      // Update UI after short delay to show success message
      tokenTimeoutId = setTimeout(() => {
        tokenTimeoutId = null;
        tokenStatus.hidden = true;
        tokenInput.value = '';
        updateTokenUI();
        updateEstimate();
      }, 1500);
    } else {
      const errorMsg = result.error === 'exhausted'
        ? 'This license key has no remaining sessions. Purchase a new key to continue.'
        : 'Invalid license key. Please check and try again.';
      showTokenStatus(errorMsg, 'error');
    }
  } catch (err) {
    console.error('License validation error:', err);
    showTokenStatus('Network error. Please try again.', 'error');
  } finally {
    tokenValidateBtn.disabled = false;
  }
}

// Show token status message
function showTokenStatus(message: string, type: 'success' | 'error' | 'loading'): void {
  tokenStatus.hidden = false;
  tokenStatus.textContent = message;
  tokenStatus.className = `token-status token-status-${type}`;
}

// Clear stored token
function clearToken(): void {
  storedToken = null;
  sessionsRemaining = null;
  sessionExpiresAt = null;
  hasActiveSession = false;
  licenseValidated = false;
  paidSnpList = null;
  localStorage.removeItem(TOKEN_STORAGE_KEY);

  // Hide purchase success banner if visible
  purchaseSuccessBanner.hidden = true;

  // If currently on a paid preset, switch to demo
  if (PRESET_REQUIRES_TOKEN[currentPreset]) {
    currentPreset = 'demo';
    selectedCategories = CATEGORY_PRESETS.demo;
    localStorage.setItem(PRESET_STORAGE_KEY, currentPreset);
    setPresetRadio('demo');
    updateCategoryCheckboxes();
  }

  updateTokenUI();
  updateEstimate();
}

// Handle purchase link click
function handlePurchaseClick(e: Event): void {
  e.preventDefault();

  if (!isLemonSqueezyConfigured()) {
    showTokenStatus('Checkout is being configured. Please try again later.', 'error');
    return;
  }

  showTokenStatus('Opening checkout...', 'loading');

  openCheckout({
    onSuccess: (_orderId, email) => {
      // License key is generated via webhook and sent to user's email
      // The email includes a link with ?license_key= that auto-fills the form
      showTokenStatus(
        `Payment successful! Your license key has been sent to ${email || 'your email'}. Check your inbox and click the link, or enter the key above.`,
        'success'
      );
    },
    onClose: () => {
      tokenStatus.hidden = true;
    },
  });
}

function isValidFormat(value: string): value is OutputFormat {
  return value === 'detailed' || value === 'compact' || value === 'minimal';
}

function isValidPreset(value: string): value is CategoryPreset {
  return value === 'demo' || value === 'wellness' || value === 'full';
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

// Generate category checkboxes dynamically using DOM APIs
function generateCategoryCheckboxes(): void {
  // Clear existing children using DOM API consistently
  while (categoryCheckboxes.firstChild) {
    categoryCheckboxes.removeChild(categoryCheckboxes.firstChild);
  }

  for (const category of ALL_CATEGORIES) {
    const labelInfo = CATEGORY_LABELS[category];
    const isChecked = selectedCategories.includes(category);

    const wrapper = document.createElement('label');
    wrapper.className = 'category-checkbox';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = category;
    checkbox.checked = isChecked;
    checkbox.addEventListener('change', handleCategoryCheckboxChange);

    const labelSpan = document.createElement('span');
    labelSpan.className = 'category-checkbox-label';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'category-checkbox-name';
    nameSpan.textContent = labelInfo.name;

    const descSpan = document.createElement('span');
    descSpan.className = 'category-checkbox-desc';
    descSpan.textContent = labelInfo.description;

    labelSpan.appendChild(nameSpan);
    labelSpan.appendChild(descSpan);
    wrapper.appendChild(checkbox);
    wrapper.appendChild(labelSpan);
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

  // Update token section visibility and estimate
  updateTokenSectionVisibility();
  updateEstimate();
}

function updateEstimate(): void {
  if (!currentParseResult || !snpList) return;

  // Use paid SNP list for estimate if paid preset selected and list is available
  const listToUse =
    PRESET_REQUIRES_TOKEN[currentPreset] && paidSnpList ? paidSnpList : snpList;

  const estimate = estimateMatches(currentParseResult, listToUse, selectedCategories);
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
    // Ignore if this reader was superseded by a new one
    if (currentReader !== reader) return;
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

// Fetch the paid SNP list using validate-token (consumes a session if starting new one)
async function fetchPaidSnpList(): Promise<boolean> {
  if (!storedToken) {
    return false;
  }

  try {
    showStatus('Starting session and loading SNP data...');

    const response = await fetch(`${API_BASE_URL}/api/validate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: storedToken }),
    });

    if (!response.ok) {
      console.error('Validate token HTTP error:', response.status);
      showError('Network error. Please try again.');
      return false;
    }

    const data = await response.json();

    if (data.valid && data.encryptedSnpList && data.iv) {
      // Update session state
      sessionsRemaining = data.sessionsRemaining ?? null;
      sessionExpiresAt = data.sessionExpiresAt ? new Date(data.sessionExpiresAt) : null;
      hasActiveSession = true;

      // Decrypt and cache the SNP list
      paidSnpList = await decryptSnpList(data.encryptedSnpList, data.iv, storedToken);
      updateTokenUI();
      return true;
    } else {
      const errorMsg = data.error === 'exhausted'
        ? 'This license key has no remaining sessions.'
        : 'Failed to load SNP data. Please try again.';
      showError(errorMsg);
      return false;
    }
  } catch (err) {
    console.error('Failed to fetch paid SNP list:', err);
    showError('Network error. Please try again.');
    return false;
  }
}

// Perform extraction with selected categories (Step 2)
async function performExtraction(): Promise<void> {
  if (!currentParseResult || !snpList) {
    showError('No file loaded. Please upload a genome file first.');
    return;
  }

  // Check if paid tier is selected
  if (PRESET_REQUIRES_TOKEN[currentPreset]) {
    if (!storedToken || !licenseValidated) {
      showError('Please enter a valid license key for Full Access reports.');
      return;
    }

    // If we don't have the cached SNP list yet, fetch it (this consumes a session)
    if (!paidSnpList) {
      const success = await fetchPaidSnpList();
      if (!success) {
        return;
      }
    }
  }

  try {
    showStatus('Extracting variants...');

    // Use paid SNP list if available and paid tier selected, otherwise free list
    const listToUse = PRESET_REQUIRES_TOKEN[currentPreset] && paidSnpList ? paidSnpList : snpList;

    // Extract matching variants with category filter
    const extractionResult = extractVariants(currentParseResult, listToUse, selectedCategories);

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

  try {
    const filename = generateFilename(selectedFormat);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    URL.revokeObjectURL(url);
  }
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
