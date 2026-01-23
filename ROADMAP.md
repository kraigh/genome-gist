# SNP Extractor - Roadmap

> Check this file at session start. Update status after completing work.

## Status Key
- `[ ]` Todo
- `[-]` In Progress 🏗️ YYYY-MM-DD
- `[x]` Done ✅ YYYY-MM-DD

---

## Phase 1: MVP (Free Tier)

### Parser
- [ ] Implement format detector (identify 23andMe vs Ancestry from content)
- [ ] Implement 23andMe parser (current format)
- [ ] Handle parse errors with clear messages
- [ ] Add tests with sample files

### Free SNP List
- [ ] Define JSON schema for SNP list
- [ ] Create free tier list (MTHFR, COMT, basic CYP variants ~15 SNPs)
- [ ] Bundle in `public/snp-list-free.json`

### Extractor
- [ ] Match rsIDs from genome file to SNP list
- [ ] Pull genotype for each match
- [ ] Handle missing/no-call genotypes

### Output
- [ ] Implement YAML exporter
- [ ] Add metadata (version, date, source format, disclaimer)
- [ ] Implement download functionality

### UI
- [ ] Basic HTML layout
- [ ] File upload with drag-and-drop
- [ ] Progress indicator during processing
- [ ] Download button
- [ ] Error display

---

## Phase 2: Paid Tier

### Stripe Integration
- [ ] Set up Stripe Checkout
- [ ] Create success/cancel redirect pages
- [ ] Handle payment webhook

### Token System
- [ ] Choose database (Cloudflare D1, PlanetScale, etc.)
- [ ] Implement token generation
- [ ] Create validate-token API endpoint
- [ ] Create recover-token API endpoint
- [ ] Implement uses decrement logic

### Client Integration
- [ ] Token input UI
- [ ] Store token in localStorage
- [ ] Fetch full SNP list on valid token
- [ ] Handle token errors gracefully

### Email
- [ ] Send token on purchase
- [ ] Token recovery email flow

---

## Phase 3: Polish

### Additional Formats
- [ ] AncestryDNA parser
- [ ] Legacy 23andMe formats
- [ ] MyHeritage (if common enough)

### Output Options
- [ ] JSON export option
- [ ] Copy to clipboard

### UX
- [ ] Improve error messages
- [ ] Add format detection feedback
- [ ] Mobile-responsive layout

---

## Backlog

- [ ] Crypto payments (BTCPay or Coinbase Commerce)
- [ ] API access tier for developers
- [ ] SNP list update subscription model

---

## Completed

- [x] Project setup (CLAUDE.md, ROADMAP.md) ✅ 2025-01-09
