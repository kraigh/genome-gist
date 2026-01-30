/**
 * GenomeGist - Main entry point
 */

import { parseGenomeFile, formatDisplayName } from './parser';
import { loadFreeSNPList, validateSNPList } from './snp-list';
import { extractVariants, estimateMatches } from './extractor';
import { toYAML, generateFilename } from './output';
import type {
  SNPList,
  ExtractionResult,
  OutputFormat,
  ParseResult,
  SNPCategory,
  Tier,
} from './types';
import {
  ParseError,
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  TIER_REQUIRES_LICENSE,
  ESTIMATED_CATEGORY_COUNTS,
} from './types';
import { VERSION, TOOL_NAME } from './version';
import { initializeLemonSqueezy, openCheckout, isLemonSqueezyConfigured } from './lemon-squeezy';

// localStorage keys
const FORMAT_STORAGE_KEY = 'genomegist-output-format';
const TIER_STORAGE_KEY = 'genomegist-tier';
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

// DOM elements - Extraction panel
const extractionPanel = getElement<HTMLDivElement>('extraction-panel');
const detectedFormat = getElement<HTMLElement>('detected-format');
const variantCount = getElement<HTMLElement>('variant-count');
const changeFileBtn = getElement<HTMLButtonElement>('change-file-btn');
const categoryCheckboxes = getElement<HTMLDivElement>('category-checkboxes');
const categoriesSection = getElement<HTMLDivElement>('categories-section');

// DOM elements - Preview stats and actions
const previewMatched = getElement<HTMLSpanElement>('preview-matched');
const previewNocall = getElement<HTMLSpanElement>('preview-nocall');
const previewMissing = getElement<HTMLSpanElement>('preview-missing');
const fileSizeSpan = getElement<HTMLSpanElement>('file-size');
const downloadBtn = getElement<HTMLButtonElement>('download-btn');
const extractionHint = getElement<HTMLParagraphElement>('extraction-hint');

// DOM elements - License sections
const licensePurchase = getElement<HTMLDivElement>('license-purchase');
const purchaseBtn = getElement<HTMLButtonElement>('purchase-btn');
const manualKeyLink = getElement<HTMLAnchorElement>('manual-key-link');
const licenseInput = getElement<HTMLDivElement>('license-input');
const tokenInput = getElement<HTMLInputElement>('token-input');
const tokenValidateBtn = getElement<HTMLButtonElement>('token-validate-btn');
const backToPurchaseLink = getElement<HTMLAnchorElement>('back-to-purchase-link');
const tokenStatus = getElement<HTMLDivElement>('token-status');
const licenseActive = getElement<HTMLDivElement>('license-active');
const licenseStatusText = getElement<HTMLSpanElement>('license-status-text');
const sessionInfo = getElement<HTMLSpanElement>('session-info');
const tokenClearBtn = getElement<HTMLButtonElement>('token-clear-btn');

// DOM elements - Success banner
const purchaseSuccessBanner = getElement<HTMLDivElement>('purchase-success-banner');
const dismissSuccessBanner = getElement<HTMLButtonElement>('dismiss-success-banner');

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
let selectedCategories: SNPCategory[] = [...ALL_CATEGORIES];
let selectedTier: Tier = 'free';
let storedToken: string | null = null;
let sessionsRemaining: number | null = null;
let sessionExpiresAt: Date | null = null;
let hasActiveSession = false; // Whether there's an active 24h session (from check-license)
let licenseValidated = false; // Whether license has been validated (without consuming session)
let tokenTimeoutId: ReturnType<typeof setTimeout> | null = null;
let showManualInput = false; // Whether to show manual license input vs purchase button

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

      // Auto-select full tier when license is present
      selectedTier = 'full';
      localStorage.setItem(TIER_STORAGE_KEY, selectedTier);
      setTierRadio(selectedTier);

      tokenStatus.hidden = true;
      updateLicenseSectionUI();
      updateDownloadButtonState();
    } else {
      // Show error for invalid/exhausted license
      const errorMsg = result.error === 'exhausted'
        ? 'This license key has no remaining sessions. Purchase a new key to continue.'
        : 'Invalid license key.';
      showTokenStatus(errorMsg, 'error');
      showManualInput = true;
      // Hide purchase success banner if license is invalid
      purchaseSuccessBanner.hidden = true;
    }
  } else {
    // Restore token from localStorage (if no URL param)
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (savedToken) {
      storedToken = savedToken;
      // Auto-select full tier when license is present
      selectedTier = 'full';
      setTierRadio(selectedTier);
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
          updateLicenseSectionUI();
          updateDownloadButtonState();
        } else {
          // Stored license is no longer valid, clear it
          clearToken();
        }
      });
      // Show as active while we verify
      updateLicenseSectionUI();
      updateDownloadButtonState();
    }
  }

  // Restore format preference
  const savedFormat = localStorage.getItem(FORMAT_STORAGE_KEY);
  if (savedFormat && isValidFormat(savedFormat)) {
    selectedFormat = savedFormat;
    setFormatRadio(savedFormat);
  }

  // Restore tier preference (but validate token requirement)
  const savedTier = localStorage.getItem(TIER_STORAGE_KEY);
  if (savedTier && isValidTier(savedTier)) {
    // If saved tier requires license but no token stored, fall back to free
    if (TIER_REQUIRES_LICENSE[savedTier] && !storedToken) {
      selectedTier = 'free';
      setTierRadio('free');
    } else {
      selectedTier = savedTier;
      setTierRadio(savedTier);
    }
  }

  // Set up format change listeners
  const formatInputs = document.querySelectorAll<HTMLInputElement>('input[name="output-format"]');
  formatInputs.forEach((input) => {
    input.addEventListener('change', () => {
      if (isValidFormat(input.value)) {
        selectedFormat = input.value;
        localStorage.setItem(FORMAT_STORAGE_KEY, selectedFormat);
        updateExtractionPreview();
      }
    });
  });

  // Set up tier change listeners
  const tierInputs = document.querySelectorAll<HTMLInputElement>('input[name="tier"]');
  tierInputs.forEach((input) => {
    input.addEventListener('change', () => {
      if (isValidTier(input.value)) {
        handleTierChange(input.value);
      }
    });
  });

  // Set up license section event listeners
  tokenValidateBtn.addEventListener('click', handleTokenValidation);
  tokenInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleTokenValidation();
    }
  });
  tokenClearBtn.addEventListener('click', clearToken);
  purchaseBtn.addEventListener('click', handlePurchaseClick);
  manualKeyLink.addEventListener('click', (e) => {
    e.preventDefault();
    showManualInput = true;
    updateLicenseSectionUI();
    tokenInput.focus();
  });
  backToPurchaseLink.addEventListener('click', (e) => {
    e.preventDefault();
    showManualInput = false;
    updateLicenseSectionUI();
  });

  // Generate category checkboxes
  generateCategoryCheckboxes();

  // Update license section visibility based on initial state
  updateLicenseSectionUI();

  // Set up Buy Now buttons on the page
  const buyNowButtons = document.querySelectorAll<HTMLButtonElement>('[data-action="buy"]');
  buyNowButtons.forEach((btn) => {
    btn.addEventListener('click', handlePurchaseClick);
  });

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

// Handle tier selection changes
function handleTierChange(tier: Tier): void {
  selectedTier = tier;
  localStorage.setItem(TIER_STORAGE_KEY, selectedTier);
  updateLicenseSectionUI();
  updateDownloadButtonState();
  updateCategoryCounts();
  updateExtractionPreview();
}

// Update license section visibility based on current state
function updateLicenseSectionUI(): void {
  const requiresLicense = TIER_REQUIRES_LICENSE[selectedTier];

  // Hide all license sections first
  licensePurchase.hidden = true;
  licenseInput.hidden = true;
  licenseActive.hidden = true;
  categoriesSection.hidden = selectedTier === 'free'; // Hide categories for free tier

  if (!requiresLicense) {
    // Free tier - no license section needed
    return;
  }

  if (storedToken && licenseValidated) {
    // License key is stored and validated - show active badge
    licenseActive.hidden = false;

    // Update status text and session info based on state
    if (hasActiveSession && sessionExpiresAt) {
      const now = new Date();
      if (sessionExpiresAt > now) {
        const hoursLeft = Math.ceil((sessionExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));
        licenseStatusText.textContent = 'Full Access Unlocked';
        sessionInfo.textContent = `Unlimited exports for ${hoursLeft} more hours`;
      } else {
        // Session expired, but license still valid
        licenseStatusText.textContent = 'Full Access Unlocked';
        sessionInfo.textContent = sessionsRemaining !== null ? `${sessionsRemaining} session${sessionsRemaining === 1 ? '' : 's'} · each = 24h unlimited` : '';
      }
    } else if (paidSnpList) {
      // Have SNP list cached (session started during this page load)
      licenseStatusText.textContent = 'Full Access Unlocked';
      if (sessionExpiresAt) {
        const now = new Date();
        const hoursLeft = Math.ceil((sessionExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));
        sessionInfo.textContent = `Unlimited exports for ${hoursLeft} more hours`;
      } else {
        sessionInfo.textContent = '';
      }
    } else {
      // License validated but no active session yet
      licenseStatusText.textContent = 'Full Access Unlocked';
      sessionInfo.textContent = sessionsRemaining !== null ? `${sessionsRemaining} session${sessionsRemaining === 1 ? '' : 's'} · each = 24h unlimited` : '';
    }
  } else if (storedToken) {
    // Token stored but not yet validated - show as pending in active section
    licenseActive.hidden = false;
    licenseStatusText.textContent = 'Verifying license...';
    sessionInfo.textContent = '';
  } else if (showManualInput) {
    // Show manual input section
    licenseInput.hidden = false;
  } else {
    // Show purchase CTA
    licensePurchase.hidden = false;
  }
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
      showManualInput = false;
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
        updateLicenseSectionUI();
        updateExtractionPreview();
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
  showManualInput = false;
  localStorage.removeItem(TOKEN_STORAGE_KEY);

  // Hide purchase success banner if visible
  purchaseSuccessBanner.hidden = true;

  // If currently on full tier, switch to free
  if (TIER_REQUIRES_LICENSE[selectedTier]) {
    selectedTier = 'free';
    localStorage.setItem(TIER_STORAGE_KEY, selectedTier);
    setTierRadio('free');
  }

  updateLicenseSectionUI();
  updateExtractionPreview();
}

// Handle purchase button click
function handlePurchaseClick(e: Event): void {
  e.preventDefault();

  if (!isLemonSqueezyConfigured()) {
    showManualInput = true;
    updateLicenseSectionUI();
    showTokenStatus('Checkout is being configured. Please enter your license key manually.', 'error');
    return;
  }

  openCheckout({
    onSuccess: (_orderId, email) => {
      // License key is generated via webhook and sent to user's email
      // The email includes a link with ?license_key= that auto-fills the form
      showManualInput = true;
      updateLicenseSectionUI();
      showTokenStatus(
        `Payment successful! Your license key has been sent to ${email || 'your email'}. Check your inbox and click the link, or enter the key below.`,
        'success'
      );
    },
    onClose: () => {
      // Checkout closed without completing - no action needed
    },
  });
}

function isValidFormat(value: string): value is OutputFormat {
  return value === 'detailed' || value === 'compact' || value === 'minimal';
}

function isValidTier(value: string): value is Tier {
  return value === 'free' || value === 'full';
}

function setFormatRadio(format: OutputFormat): void {
  const input = document.querySelector<HTMLInputElement>(`input[name="output-format"][value="${format}"]`);
  if (input) {
    input.checked = true;
  }
}

function setTierRadio(tier: Tier): void {
  const input = document.querySelector<HTMLInputElement>(`input[name="tier"][value="${tier}"]`);
  if (input) {
    input.checked = true;
  }
}

// Generate category toggles dynamically using DOM APIs
function generateCategoryCheckboxes(): void {
  // Clear existing children using DOM API consistently
  while (categoryCheckboxes.firstChild) {
    categoryCheckboxes.removeChild(categoryCheckboxes.firstChild);
  }

  for (const category of ALL_CATEGORIES) {
    const labelInfo = CATEGORY_LABELS[category];
    const isChecked = selectedCategories.includes(category);

    const wrapper = document.createElement('label');
    wrapper.className = `category-toggle${isChecked ? ' active' : ''}`;
    wrapper.dataset.category = category;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = category;
    checkbox.checked = isChecked;
    checkbox.addEventListener('change', handleCategoryCheckboxChange);

    const contentSpan = document.createElement('span');
    contentSpan.className = 'category-toggle-content';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'category-toggle-name';
    nameSpan.textContent = labelInfo.name;

    // Add count span (will be updated when file is loaded)
    const countSpan = document.createElement('span');
    countSpan.className = 'category-toggle-count';
    countSpan.dataset.categoryCount = category;
    countSpan.textContent = '—';

    contentSpan.appendChild(nameSpan);
    contentSpan.appendChild(countSpan);

    // Toggle switch
    const switchSpan = document.createElement('span');
    switchSpan.className = 'category-toggle-switch';

    wrapper.appendChild(checkbox);
    wrapper.appendChild(contentSpan);
    wrapper.appendChild(switchSpan);
    categoryCheckboxes.appendChild(wrapper);
  }
}

function handleCategoryCheckboxChange(e: Event): void {
  const checkbox = e.target as HTMLInputElement;
  const wrapper = checkbox.closest('.category-toggle');

  // Update wrapper active class
  if (wrapper) {
    wrapper.classList.toggle('active', checkbox.checked);
  }

  // Gather all checked categories
  const checkboxes = categoryCheckboxes.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
  selectedCategories = [];

  checkboxes.forEach((cb) => {
    if (cb.checked) {
      selectedCategories.push(cb.value as SNPCategory);
    }
  });

  updateExtractionPreview();
}

// UI Helpers
function showStatus(message: string): void {
  statusDiv.hidden = false;
  statusText.textContent = message;
  extractionPanel.hidden = true;
  errorDiv.hidden = true;
}

function hideStatus(): void {
  statusDiv.hidden = true;
}

function showExtractionPanel(parseResult: ParseResult): void {
  statusDiv.hidden = true;
  extractionPanel.hidden = false;
  errorDiv.hidden = true;
  uploadZone.hidden = true;

  currentParseResult = parseResult;

  // Display format and variant count
  detectedFormat.textContent = formatDisplayName(parseResult.format);
  variantCount.textContent = parseResult.variants.length.toLocaleString();

  // Update license section, button state, and extraction preview
  updateLicenseSectionUI();
  updateDownloadButtonState();
  updateCategoryCounts();
  updateExtractionPreview();
}

// Format count for display (e.g., "~50", "~1k", "~10k")
function formatEstimatedCount(count: number): string {
  if (count >= 10000) {
    return `~${Math.round(count / 1000)}k`;
  } else if (count >= 1000) {
    return `~${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  } else {
    return `~${count}`;
  }
}

// Update category toggle counts based on parsed file
function updateCategoryCounts(): void {
  // Get list to use for counting
  // For full tier: use paid list if available, otherwise show estimates
  // For free tier: use free list
  const isPaidTier = TIER_REQUIRES_LICENSE[selectedTier];
  const listToUse = isPaidTier ? paidSnpList : snpList;

  // Count matches by category if we have both a file and a list
  const countByCategory: Record<string, number> = {};
  if (currentParseResult && listToUse) {
    const rsidSet = new Set(currentParseResult.variants.map((v) => v.rsid));
    for (const entry of listToUse.variants) {
      if (rsidSet.has(entry.rsid)) {
        countByCategory[entry.category] = (countByCategory[entry.category] || 0) + 1;
      }
    }
  }

  // Update count spans
  for (const category of ALL_CATEGORIES) {
    const countSpan = document.querySelector<HTMLSpanElement>(`[data-category-count="${category}"]`);
    if (countSpan) {
      if (!currentParseResult) {
        // No file loaded - show dash
        countSpan.textContent = '—';
      } else if (isPaidTier && !paidSnpList) {
        // Paid tier but no SNP list yet - show estimates
        const estimate = ESTIMATED_CATEGORY_COUNTS[category as SNPCategory] || 0;
        countSpan.textContent = formatEstimatedCount(estimate);
      } else {
        // Have actual counts
        const count = countByCategory[category] || 0;
        countSpan.textContent = count.toString();
      }
    }
  }
}

// Update the extraction preview (stats and file size estimate)
function updateExtractionPreview(): void {
  if (!currentParseResult || !snpList) {
    // No file loaded yet, show placeholder
    previewMatched.textContent = '—';
    previewNocall.textContent = '—';
    previewMissing.textContent = '—';
    fileSizeSpan.textContent = '—';
    return;
  }

  const isPaidTier = TIER_REQUIRES_LICENSE[selectedTier];

  // If paid tier but no SNP list yet, show estimates
  if (isPaidTier && !paidSnpList) {
    // Calculate estimated total from selected categories
    let estimatedTotal = 0;
    for (const category of selectedCategories) {
      estimatedTotal += ESTIMATED_CATEGORY_COUNTS[category] || 0;
    }

    previewMatched.textContent = formatEstimatedCount(estimatedTotal);
    previewNocall.textContent = '—';
    previewMissing.textContent = '—';

    // Estimate file size
    let estimatedBytes: number;
    switch (selectedFormat) {
      case 'detailed':
        estimatedBytes = estimatedTotal * 180 + 500;
        break;
      case 'compact':
        estimatedBytes = estimatedTotal * 35 + 200;
        break;
      case 'minimal':
        estimatedBytes = estimatedTotal * 20 + 100;
        break;
    }
    fileSizeSpan.textContent = `~${formatBytes(estimatedBytes)}`;
    return;
  }

  // Use paid SNP list if full tier selected and list is available
  const listToUse = isPaidTier && paidSnpList ? paidSnpList : snpList;

  // Get categories to use (all categories for full tier, free list is already limited)
  const categoriesToUse = selectedTier === 'full' ? selectedCategories : ALL_CATEGORIES;

  // Get estimate
  const estimate = estimateMatches(currentParseResult, listToUse, categoriesToUse);

  // Update preview stats
  previewMatched.textContent = estimate.total.toString();

  // For no-call and missing, we need to do a rough calculation
  // No-call: variants that are in the file but have "--" genotype
  // Missing: variants in SNP list but not in file
  const rsidSet = new Set(currentParseResult.variants.map((v) => v.rsid));
  const noCallSet = new Set(
    currentParseResult.variants.filter((v) => v.genotype === '--').map((v) => v.rsid)
  );

  let noCallCount = 0;
  let missingCount = 0;
  for (const entry of listToUse.variants) {
    if (!categoriesToUse.includes(entry.category)) continue;
    if (!rsidSet.has(entry.rsid)) {
      missingCount++;
    } else if (noCallSet.has(entry.rsid)) {
      noCallCount++;
    }
  }

  previewNocall.textContent = noCallCount.toString();
  previewMissing.textContent = missingCount.toString();

  // Estimate file size based on format and variant count
  // This is a rough estimate; actual size calculated on download
  const variantCount = estimate.total;
  let estimatedBytes: number;
  switch (selectedFormat) {
    case 'detailed':
      estimatedBytes = variantCount * 180 + 500; // ~180 bytes per variant + metadata
      break;
    case 'compact':
      estimatedBytes = variantCount * 35 + 200;
      break;
    case 'minimal':
      estimatedBytes = variantCount * 20 + 100;
      break;
  }

  fileSizeSpan.textContent = formatBytes(estimatedBytes);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function showError(message: string): void {
  statusDiv.hidden = true;
  extractionPanel.hidden = true;
  errorDiv.hidden = false;
  errorText.textContent = message;
}

function resetToUpload(): void {
  currentParseResult = null;
  currentResult = null;

  statusDiv.hidden = true;
  extractionPanel.hidden = true;
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

    parseAndShowExtractionPanel(content);
  };

  reader.onerror = () => {
    // Ignore if this reader was superseded by a new one
    if (currentReader !== reader) return;
    showError('Failed to read file. Please try again.');
  };

  reader.readAsText(file);
}

// Parse genome file and show extraction panel
function parseAndShowExtractionPanel(content: string): void {
  if (!snpList) {
    showError('SNP list not loaded. Please refresh the page.');
    return;
  }

  try {
    showStatus('Parsing genome file...');
    const parseResult = parseGenomeFile(content);

    // Show extraction panel
    showExtractionPanel(parseResult);
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
      updateLicenseSectionUI();
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

// Update download button state based on tier and license validity
function updateDownloadButtonState(): void {
  const requiresLicense = TIER_REQUIRES_LICENSE[selectedTier];
  const canDownload = !requiresLicense || (storedToken && licenseValidated);

  downloadBtn.disabled = !canDownload;

  if (!canDownload) {
    downloadBtn.classList.add('btn-disabled');
    downloadBtn.title = 'Valid license key required for Full Report';
    extractionHint.textContent = 'Purchase Full Access or enter a license key to save results.';
    extractionHint.classList.add('extraction-hint-warning');
  } else {
    downloadBtn.classList.remove('btn-disabled');
    downloadBtn.title = '';
    extractionHint.textContent = 'Change any settings above and save again anytime.';
    extractionHint.classList.remove('extraction-hint-warning');
  }
}

// Perform extraction and download
async function performExtractionAndDownload(): Promise<void> {
  if (!currentParseResult || !snpList) {
    showError('No file loaded. Please upload a genome file first.');
    return;
  }

  // Check if paid tier is selected
  if (TIER_REQUIRES_LICENSE[selectedTier]) {
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
      // Update the preview with the paid list now available
      updateCategoryCounts();
      updateExtractionPreview();
    }
  }

  try {
    showStatus('Extracting variants...');

    // Use paid SNP list if available and full tier selected, otherwise free list
    const listToUse = TIER_REQUIRES_LICENSE[selectedTier] && paidSnpList ? paidSnpList : snpList;

    // Get categories to use (all categories for free tier, selected for full)
    const categoriesToUse = selectedTier === 'full' ? selectedCategories : ALL_CATEGORIES;

    // Extract matching variants with category filter
    currentResult = extractVariants(currentParseResult, listToUse, categoriesToUse);

    // Download immediately
    downloadResults();

    // Return to extraction panel
    hideStatus();
    extractionPanel.hidden = false;
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

// Extraction panel action buttons
changeFileBtn.addEventListener('click', resetToUpload);
downloadBtn.addEventListener('click', performExtractionAndDownload);

// Prevent default drag behavior on document
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

// Initialize on load
init();
