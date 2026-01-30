#!/bin/bash
# Sync SNP categories from genome-gist-pipeline
#
# This script copies the generated category TypeScript file from the pipeline
# output to the frontend source directory.
#
# Usage: npm run sync-categories
#        or: ./scripts/sync-categories.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Source and destination paths
PIPELINE_DIR="${PROJECT_DIR}/../genome-gist-pipeline"
SOURCE_FILE="${PIPELINE_DIR}/output/snp-categories.ts"
DEST_DIR="${PROJECT_DIR}/src/generated"
DEST_FILE="${DEST_DIR}/snp-categories.ts"

# Check if pipeline directory exists
if [ ! -d "$PIPELINE_DIR" ]; then
    echo "Warning: genome-gist-pipeline not found at ${PIPELINE_DIR}"
    echo "Skipping category sync. Using existing categories."
    exit 0
fi

# Check if source file exists
if [ ! -f "$SOURCE_FILE" ]; then
    echo "Warning: snp-categories.ts not found at ${SOURCE_FILE}"
    echo "Run 'node scripts/generate-categories.cjs' in genome-gist-pipeline first."
    echo "Skipping category sync. Using existing categories."
    exit 0
fi

# Create destination directory if needed
mkdir -p "$DEST_DIR"

# Copy the file
cp "$SOURCE_FILE" "$DEST_FILE"
echo "✓ Synced categories from pipeline: ${DEST_FILE}"

# Show a brief summary
if command -v grep &> /dev/null; then
    TOTAL=$(grep -o 'ESTIMATED_TOTAL_COUNT = [0-9]*' "$DEST_FILE" | grep -o '[0-9]*')
    if [ -n "$TOTAL" ]; then
        echo "  Total SNPs: ${TOTAL}"
    fi
fi
