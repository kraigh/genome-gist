# GenomeGist - Roadmap

> Check this file at session start. Update status after completing work.

## Status Key
- `[ ]` Todo
- `[-]` In Progress
- `[x]` Done

---

## Phase 1: MVP (Free Tier)

### 1.1 Project Scaffolding
- [x] Initialize Vite + TypeScript project
- [x] Configure tsconfig.json (strict mode, ES2020)
- [x] Set up ESLint + Prettier
- [x] Configure Vitest for testing
- [x] Create index.html skeleton with semantic structure
- [x] Create styles.css with design tokens (colors, typography, spacing)
- [x] Set up basic responsive layout (centered single column)

### 1.2 Core Types
- [x] Define GenomeVariant type (rsid, chromosome, position, genotype)
- [x] Define SNPEntry type (rsid, gene, category, annotation, sources)
- [x] Define SNPList type (version, variants array)
- [x] Define ExtractionResult type (metadata + matched variants)

### 1.3 Parser
- [x] Implement 23andMe v5 parser (tab-separated, handles comments)
- [x] Implement format detector (identify 23andMe from header/content)
- [x] Handle edge cases: no-call genotypes (--), insertions/deletions
- [x] Return structured errors with line numbers for parse failures
- [x] Write parser tests with fixture files

### 1.4 Free SNP List
- [x] Create public/snp-list-free.json with ~15-20 well-known SNPs
- [x] Include: MTHFR (rs1801133, rs1801131), APOE (rs429358, rs7412), COMT (rs4680), VDR, CYP2C19, CYP2D6, etc.
- [x] Write annotations from public sources (ClinVar, PharmGKB, SNPedia)
- [x] Implement SNP list loader

### 1.5 Extractor
- [x] Implement rsID matching (case-insensitive)
- [x] Build lookup map for efficient matching against large genome files
- [x] Handle missing variants (in SNP list but not in genome file)
- [x] Handle no-call genotypes (report as "no-call" not missing)
- [x] Write extractor tests

### 1.6 YAML Output
- [x] Choose and install js-yaml library
- [x] Implement YAML serializer with proper formatting
- [x] Generate metadata block (tool, version, date, source format)
- [x] Draft medical/legal disclaimer text
- [x] Include disclaimer in output metadata
- [x] Write output tests

### 1.7 UI - File Upload
- [x] Create upload zone component (dashed border, instructions)
- [x] Implement drag-and-drop handling
- [x] Implement click-to-browse fallback
- [x] Show supported formats list
- [x] Validate file before processing (size limits, basic format check)

### 1.8 UI - Processing Flow
- [x] Display processing status (plain text updates)
- [x] Show progress: "Parsing file...", "Found X variants", "Matching against SNP list..."
- [x] Display results summary (X of Y SNPs found)
- [x] Handle and display errors inline (red text, clear message)

### 1.9 UI - Download
- [x] Implement YAML file generation and download
- [x] Show download button with file size
- [x] Use descriptive filename (genomegist-results-YYYY-MM-DD.yaml)

### 1.10 Integration & Polish
- [x] Wire up all components end-to-end
- [ ] Test full flow with real genome file
- [x] Add privacy messaging to page ("Your data never leaves your browser")
- [x] Add brief explanation section (what this tool does)
- [x] Add footer (version, disclaimer link)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile responsiveness check

### 1.11 Code Review Fixes (Critical)
- [x] Create proper ParseError class extending Error (parser/index.ts)
- [x] Add null checks for DOM element assertions (main.ts)

### 1.12 Code Review Fixes (Important)
- [x] Wrap JSON parsing in try-catch with helpful error (snp-list/loader.ts)
- [ ] Fix or remove v4 version detection inconsistency (parser/detector.ts)
- [ ] Expose parse warnings to caller instead of console.warn (parser/23andme.ts)
- [ ] Add FileReader abort handling for race conditions (main.ts)
- [ ] Define proper YAMLOutput type instead of type assertion (output/yaml.ts)

### 1.13 Code Review Fixes (Minor)
- [x] Remove unused createSNPLookup export (snp-list/loader.ts)
- [ ] Validate SNP list count field matches array length (snp-list/loader.ts)
- [x] Fix broken #disclaimer anchor link (index.html)
- [ ] Centralize version string to prevent drift

---

## Phase 2: Paid Tier

### 2.1 Token Input UI
- [ ] Add token input field to UI
- [ ] Store token in localStorage
- [ ] Show token status (valid/invalid/none)
- [ ] Clear token option

### 2.2 API Integration
- [ ] Create validate-token API endpoint (separate repo/service)
- [ ] Implement client-side token validation call
- [ ] Fetch full SNP list on valid token
- [ ] Handle API errors gracefully (document error handling strategy for API error types)
- [ ] Implement basic obfuscation for SNP list in memory

### 2.3 Stripe Integration
- [ ] Set up Stripe Checkout for token purchase
- [ ] Create success page (displays token)
- [ ] Create cancel page
- [ ] Implement webhook for payment confirmation

### 2.4 Token Backend
- [ ] Choose database (Cloudflare D1, PlanetScale, etc.)
- [ ] Implement token generation (on payment)
- [ ] Implement token validation endpoint
- [ ] Implement uses tracking (decrement on each use)
- [ ] Implement token recovery endpoint

### 2.5 Email
- [ ] Set up transactional email service
- [ ] Send token on purchase
- [ ] Token recovery email flow

---

## Phase 3: Polish & Additional Formats

### 3.1 Additional Parsers
- [ ] AncestryDNA parser
- [ ] Legacy 23andMe formats (v3, v4)
- [ ] Identify additional formats from popular consumer genome sequencers
- [ ] Improve format auto-detection

### 3.2 Output Options
- [ ] JSON export option
- [ ] Copy to clipboard button

### 3.3 UX Improvements
- [ ] Improve error messages with suggestions
- [ ] Add format detection feedback before processing
- [ ] Refine mobile layout

---

## Backlog

- [ ] Crypto payments (BTCPay or Coinbase Commerce)
- [ ] API access tier for developers
- [ ] SNP list update subscription model
- [ ] MyHeritage parser (if demand exists)

---

## Completed

- [x] Project setup (CLAUDE.md, DESIGN_GUIDE.md, ROADMAP.md)

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-01-23 | Vite + TypeScript, no framework | Single-page tool doesn't need React/Vue complexity |
| 2025-01-23 | Plain CSS, no Tailwind/Bootstrap | Matches "old Bootstrap" aesthetic, keeps bundle small |
| 2025-01-23 | Vitest for testing | Pairs well with Vite, good TS support |
| 2025-01-23 | js-yaml for YAML output | Standard, well-maintained library |
| 2025-01-23 | Version 1.0.0 | Semantic versioning from launch |
| 2025-01-23 | ~15-20 SNPs for free tier | Useful demo, not comprehensive enough to replace paid |
