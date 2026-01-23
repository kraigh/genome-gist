// GenomeGist - Main entry point
// Version 1.0.0

console.log('GenomeGist v1.0.0 loaded');

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
let currentResult: string | null = null;

// UI Helpers
function showStatus(message: string): void {
  statusDiv.hidden = false;
  statusText.textContent = message;
  resultsDiv.hidden = true;
  errorDiv.hidden = true;
}

function showResults(summary: string, yamlContent: string): void {
  statusDiv.hidden = true;
  resultsDiv.hidden = false;
  resultsSummary.textContent = summary;
  currentResult = yamlContent;
  errorDiv.hidden = true;
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

  // Basic validation
  if (!file.name.endsWith('.txt') && !file.name.endsWith('.csv')) {
    showError('Unsupported file format. Please upload a .txt file from 23andMe.');
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

    processGenomeFile(content, file.name);
  };

  reader.onerror = () => {
    showError('Failed to read file. Please try again.');
  };

  reader.readAsText(file);
}

// Process genome file (placeholder - will be implemented in parser module)
function processGenomeFile(content: string, filename: string): void {
  showStatus('Parsing genome file...');

  // TODO: Implement actual parsing
  // For now, just count lines to show something is working
  const lines = content.split('\n');
  const dataLines = lines.filter((line) => !line.startsWith('#') && line.trim().length > 0);

  showStatus(`Found ${dataLines.length.toLocaleString()} variants. Matching against SNP list...`);

  // Simulate processing delay for demo
  setTimeout(() => {
    // TODO: Replace with actual extraction logic
    const placeholderYaml = `# GenomeGist Results
# This is a placeholder - full implementation coming soon
metadata:
  tool: GenomeGist
  version: 1.0.0
  source_file: ${filename}
  variants_in_file: ${dataLines.length}
`;

    showResults(`Processed ${dataLines.length.toLocaleString()} variants from ${filename}`, placeholderYaml);
  }, 500);
}

// Download handler
function downloadResults(): void {
  if (!currentResult) return;

  const blob = new Blob([currentResult], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().split('T')[0];
  const filename = `genomegist-results-${date}.yaml`;

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
