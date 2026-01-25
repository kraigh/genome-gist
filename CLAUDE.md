# GenomeGist

Browser-based tool that extracts clinically and wellness-relevant SNPs from genome file exports (23andMe, AncestryDNA, others). All processing happens client-side — raw genetic data never leaves the user's device.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Production build
npm test             # Run tests
npm run lint         # Lint code
```

## What This Tool Does

1. User uploads a genome file (drag-and-drop or file picker)
2. JavaScript parses the file entirely in the browser
3. Tool matches variants against a target SNP list
4. User downloads a YAML file with extracted data

The output file should be small (<10MB) so it can be easily uploaded to AI tools without consuming too much context.

## Two Tiers

**Free tier:** Uses a short, bundled SNP list for demonstration. No server calls needed.

**Paid tier:** User enters a token (purchased via Stripe). Token is validated via API, which returns the proprietary SNP list. Token is valid for ~3 uses.

## Token API Contract

Base URL: `https://api.genomegist.com`

Token format: `gg_<24-char-random>` (e.g., `gg_a1b2c3d4e5f6g7h8i9j0k1l2`)

### POST /api/validate-token

**Request:**
```json
{ "token": "gg_abc123..." }
```

**Response (success):**
```json
{ "valid": true, "usesRemaining": 2, "encryptedSnpList": "<base64>", "iv": "<base64>" }
```

**Response (invalid/exhausted):**
```json
{ "valid": false, "error": "invalid_token" | "exhausted" }
```

**Note:** The SNP list is encrypted. See "SNP List Decryption" section below.

### POST /api/recover-token

**Request:**
```json
{ "email": "user@example.com" }
```

**Response (always succeeds to prevent enumeration):**
```json
{ "success": true }
```

### Frontend Token Flow

1. User enters token in input field
2. Call `/api/validate-token` with the token
3. On success: store token in localStorage, use returned `snpList` for extraction
4. On failure: show appropriate error ("Invalid token" or "Token exhausted")
5. Display `usesRemaining` to user after successful validation

## Critical Constraints

- **Privacy is paramount.** Genome data never leaves the browser. Token validation and SNP list fetch are the only server calls.
- **Protect the SNP list.** The paid SNP list is proprietary. While full protection isn't possible in browser, make reasonable efforts to prevent casual access (don't expose in console, don't store in easily-inspectable variables, etc.).
- **No health advice.** Output includes only: rsID, genotype, gene name, category, and factual annotations from public sources. No interpretation, no recommendations.
- **Simple UX.** One page, one job. See DESIGN_GUIDE.md for visual direction.

## Output Format

YAML file that's human-readable and LLM-friendly. Include:
- Extraction metadata (tool version, date, source format, disclaimer)
- List of variants with: rsID, gene, genotype, category, and public database annotations

The SNP list (from the pipeline repo) defines what fields are available for each variant.

## Key References

- `DESIGN_GUIDE.md` — Visual design principles and style reference
- `ROADMAP.md` — Current tasks and priorities
- `public/snp-list-free.json` — Bundled free tier SNP list
- `data/` — Local development files (gitignored). See `data/README.md`

## Notes

- Supported formats: 23andMe (current), AncestryDNA. Others may be added later.
- Use File API for client-side file reading
- Store token in localStorage for convenience
- Handle parse errors gracefully with clear, helpful messages

## Decisions Log

> Document architectural and implementation decisions here as you build.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-01-23 | Token format: `gg_<random>` | Opaque tokens stored in backend KV, supports use-counting and revocation |
| 2025-01-23 | API at api.genomegist.com | Separate subdomain for Worker API |
