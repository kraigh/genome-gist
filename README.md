# GenomeGist

A privacy-first tool for extracting clinically and wellness-relevant genetic variants (SNPs) from consumer genome files like 23andMe.

**Your genetic data never leaves your browser.** All processing happens client-side using JavaScript.

## How It Works

1. Upload your genome file (drag-and-drop or file picker)
2. Select which categories of variants to extract
3. Download the results as a compact YAML file

The output is designed to be human-readable and works well with AI assistants for exploring your genetic data.

## Privacy

This tool was built with privacy as the primary concern:

- **No server uploads** - Your genome file is processed entirely in your browser
- **No tracking** - No analytics, no cookies, no data collection
- **Open source** - Audit the code yourself to verify these claims

## Running Locally

If you prefer to run GenomeGist locally instead of using the hosted version:

```bash
# Clone the repository
git clone https://github.com/your-username/genomegist.git
cd genomegist

# Install dependencies
npm install

# Start the development server
npm run dev
```

Then open http://localhost:5173 in your browser.

## Development

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Production build
npm test             # Run tests
npm run lint         # Lint code
```

### CLI (Development Tool)

A command-line interface is included for testing and development purposes. It uses the free SNP list only (~18 variants) - the full GenomeGist service includes 1,000+ curated variants.

```bash
npm run cli -- <genome-file> [options]

# Options:
#   --format=detailed|compact|minimal  Output format (default: detailed)
#   --categories=wellness|full|all     Category preset (default: wellness)
#   --output=<file>                    Write to file instead of stdout
#   --json                             Output as JSON instead of YAML
#   --quiet, -q                        Suppress info messages

# Examples:
npm run cli -- path/to/genome.txt
npm run cli -- path/to/genome.txt --format=compact --output=results.yaml
```

## Supported Formats

- **23andMe** (v3, v4, v5) - `.txt` files from raw data download
- **AncestryDNA** - Coming soon

## License

MIT
