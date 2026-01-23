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
- [ ] Define GenomeVariant type (rsid, chromosome, position, genotype)
- [ ] Define SNPEntry type (rsid, gene, category, annotation, sources)
- [ ] Define SNPList type (version, variants array)
- [ ] Define ExtractionResult type (metadata + matched variants)

### 1.3 Parser
- [ ] Implement 23andMe v5 parser (tab-separated, handles comments)
- [ ] Implement format detector (identify 23andMe from header/content)
- [ ] Handle edge cases: no-call genotypes (--), insertions/deletions
- [ ] Return structured errors with line numbers for parse failures
- [ ] Write parser tests with fixture files

### 1.4 Free SNP List
- [ ] Create public/snp-list-free.json with ~15-20 well-known SNPs
- [ ] Include: MTHFR (rs1801133, rs1801131), APOE (rs429358, rs7412), COMT (rs4680), VDR, CYP2C19, CYP2D6, etc.
- [ ] Write annotations from public sources (ClinVar, PharmGKB, SNPedia)
- [ ] Implement SNP list loader

### 1.5 Extractor
- [ ] Implement rsID matching (case-insensitive)
- [ ] Build lookup map for efficient matching against large genome files
- [ ] Handle missing variants (in SNP list but not in genome file)
- [ ] Handle no-call genotypes (report as "no-call" not missing)
- [ ] Write extractor tests

### 1.6 YAML Output
- [ ] Choose and install js-yaml library
- [ ] Implement YAML serializer with proper formatting
- [ ] Generate metadata block (tool, version, date, source format)
- [ ] Draft medical/legal disclaimer text
- [ ] Include disclaimer in output metadata
- [ ] Write output tests

### 1.7 UI - File Upload
- [ ] Create upload zone component (dashed border, instructions)
- [ ] Implement drag-and-drop handling
- [ ] Implement click-to-browse fallback
- [ ] Show supported formats list
- [ ] Validate file before processing (size limits, basic format check)

### 1.8 UI - Processing Flow
- [ ] Display processing status (plain text updates)
- [ ] Show progress: "Parsing file...", "Found X variants", "Matching against SNP list..."
- [ ] Display results summary (X of Y SNPs found)
- [ ] Handle and display errors inline (red text, clear message)

### 1.9 UI - Download
- [ ] Implement YAML file generation and download
- [ ] Show download button with file size
- [ ] Use descriptive filename (genomegist-results-YYYY-MM-DD.yaml)

### 1.10 Integration & Polish
- [ ] Wire up all components end-to-end
- [ ] Test full flow with real genome file
- [ ] Add privacy messaging to page ("Your data never leaves your browser")
- [ ] Add brief explanation section (what this tool does)
- [ ] Add footer (version, disclaimer link)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile responsiveness check

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
- [ ] Handle API errors gracefully
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
