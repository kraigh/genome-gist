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

**Free tier:** Uses a short, bundled SNP list (~15 SNPs) for demonstration. No server calls needed.

**Paid tier ($19.99):** User enters a token (purchased via Stripe). Token is validated via API, which returns the full proprietary SNP list (1,000+ variants). Each token includes 3 sessions, where each session is a 24-hour window of unlimited use.

## Token API Contract

Base URL: `https://api.genomegist.com`

Token format: `gg_<24-char-random>` (e.g., `gg_a1b2c3d4e5f6g7h8i9j0k1l2`)

### Token Session Model

Each token ($19.99) includes **3 analysis sessions**. A session is a 24-hour window of **unlimited use** of the full SNP list.

**How sessions work:**
- First SNP list fetch starts a session (decrements `sessionsRemaining`, sets `lastUsedAt`)
- All fetches within 24 hours reuse the same session (no decrement)
- After 24 hours, next fetch starts a new session (decrements again)
- This is enforced server-side via `lastUsedAt` timestamp

**What users can do in a session:**
- Process multiple genome files (self, family members, etc.)
- Export with any combination of settings (Wellness, Full, different formats)
- Re-extract as many times as needed
- Come back within 24 hours even after closing the browser

**Why this model:**
- Best user experience — no anxiety about "wasting" a use
- Server-enforced (no client-side bypass possible)
- Clear mental model: "24 hours of unlimited access"
- 3 sessions allows coming back months later with new knowledge

### Backend Session Enforcement (Requirements)

**Token Record Structure (Cloudflare KV):**
```typescript
interface TokenRecord {
  sessionsRemaining: number;    // Starts at 3, decrements when new session starts
  lastSessionStartedAt: string | null;  // ISO 8601 timestamp, null if never used
  createdAt: string;            // ISO 8601 timestamp
  email: string;                // For token recovery
}
```

**Session Window Constant:**
```typescript
const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
```

**Validation Logic (pseudocode):**
```typescript
function validateToken(token: string): ValidationResult {
  // 1. Lookup token in KV
  const record = await KV.get(token);

  if (!record) {
    return { valid: false, error: 'invalid_token' };
  }

  const now = Date.now();
  const lastStart = record.lastSessionStartedAt
    ? new Date(record.lastSessionStartedAt).getTime()
    : null;

  // 2. Check if within an active session (last session started < 24 hours ago)
  const isWithinActiveSession = lastStart && (now - lastStart < SESSION_WINDOW_MS);

  if (isWithinActiveSession) {
    // ACTIVE SESSION: Return SNP list without decrementing
    return {
      valid: true,
      sessionsRemaining: record.sessionsRemaining,
      sessionExpiresAt: new Date(lastStart + SESSION_WINDOW_MS).toISOString(),
      encryptedSnpList: getEncryptedSnpList(token),
      iv: generateIV()
    };
  }

  // 3. No active session — need to start a new one
  if (record.sessionsRemaining <= 0) {
    return { valid: false, error: 'exhausted' };
  }

  // 4. Start new session: decrement counter, update timestamp
  const newRecord = {
    ...record,
    sessionsRemaining: record.sessionsRemaining - 1,
    lastSessionStartedAt: new Date(now).toISOString()
  };
  await KV.put(token, newRecord);

  return {
    valid: true,
    sessionsRemaining: newRecord.sessionsRemaining,
    sessionExpiresAt: new Date(now + SESSION_WINDOW_MS).toISOString(),
    encryptedSnpList: getEncryptedSnpList(token),
    iv: generateIV()
  };
}
```

**Key Behaviors:**
| Scenario | Action | sessionsRemaining |
|----------|--------|-------------------|
| First ever use | Start session, decrement | 3 → 2 |
| Within 24h of last use | Return list, NO decrement | 2 (unchanged) |
| 25 hours after last use | Start new session, decrement | 2 → 1 |
| Last session, within 24h | Return list, NO decrement | 0 (unchanged) |
| Last session expired, 0 remaining | Return error | 0 (exhausted) |

**Edge Cases:**
- Token used at 2pm Monday → session active until 2pm Tuesday
- User returns at 1pm Tuesday (23 hours later) → same session, no decrement
- User returns at 3pm Tuesday (25 hours later) → new session, decrement
- If `sessionsRemaining` is 0 AND session expired → return `exhausted` error
- If `sessionsRemaining` is 0 BUT session still active → return SNP list (honor the active session)

### POST /api/validate-token

**Request:**
```json
{ "token": "gg_abc123..." }
```

**Response (success — new or active session):**
```json
{
  "valid": true,
  "sessionsRemaining": 2,
  "sessionExpiresAt": "2025-01-26T19:00:00Z",
  "encryptedSnpList": "<base64>",
  "iv": "<base64>"
}
```

- `sessionsRemaining`: Sessions left AFTER this one (if new session started) or current count (if reusing active session)
- `sessionExpiresAt`: When the current session expires (always 24h from session start)
- `encryptedSnpList`: The paid SNP list, encrypted with the token-derived key
- `iv`: Random IV for decryption

**Response (invalid token):**
```json
{ "valid": false, "error": "invalid_token" }
```

**Response (no sessions remaining and no active session):**
```json
{ "valid": false, "error": "exhausted" }
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

1. User selects a paid tier (Wellness or Full Report)
2. If no cached SNP list, prompt for token
3. User enters token, clicks Validate
4. Call `/api/validate-token` with the token
5. On success:
   - Decrypt the SNP list (see below)
   - Cache decrypted list in memory (not localStorage — sensitive data)
   - Store token in localStorage (for session continuity)
   - Display session status ("Unlimited access until [sessionExpiresAt]")
6. On failure: show appropriate error ("Invalid token" or "No sessions remaining")
7. Use cached SNP list for all extractions within the session
8. If user returns after session expires, re-call `/api/validate-token` (starts new session if available)

## SNP List Decryption

The paid SNP list is returned encrypted to prevent casual theft from browser dev tools. The encryption key is derived from the token itself, so no hardcoded keys are needed.

**Encryption scheme:**
- Algorithm: AES-256-GCM
- Key: `SHA-256(token)` → 256-bit key
- IV: Random 12 bytes, included in response as base64

**Decryption implementation:**
```typescript
async function decryptSnpList(
  encryptedBase64: string,
  ivBase64: string,
  token: string
): Promise<object> {
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

  // Decode base64
  const encrypted = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );

  return JSON.parse(new TextDecoder().decode(decrypted));
}
```

**Usage:**
```typescript
const response = await fetch('/api/validate-token', { ... });
const data = await response.json();

if (data.valid) {
  const snpList = await decryptSnpList(data.encryptedSnpList, data.iv, token);
  // Use snpList for extraction...
}
```

**Why this approach:**
- Prevents copy/paste from Network tab
- No hardcoded keys in frontend source
- Uses native Web Crypto API (no dependencies)
- Each response encrypted with user's unique token

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
| 2025-01-25 | Token-derived encryption for SNP list | Prevents casual theft from dev tools; decrypt using SHA-256(token) as AES-GCM key |
