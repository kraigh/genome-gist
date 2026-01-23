# GenomeGist Design Guide

## Brand Identity

**Name:** GenomeGist

**Tagline:** Extract the gist of your genome.

**What it is:** A no-frills utility tool that extracts clinically relevant genetic variants from raw genome files. Built for people who want to analyze their data with AI tools.

**What it's not:** A health platform, medical service, consumer wellness app, or slick startup.

### Name

**GenomeGist** (one word, camel case)

- Logo/headers: `GenomeGist`
- URLs/code: `genomegist` or `genome-gist`
- Never: "Genome Gist", "GENOMEGIST", "genome gist"

### Domain

Primary: `genomegist.com`
- App: `genomegist.com` (root)
- API: `api.genomegist.com`

### Logo Concept

Minimal wordmark. No icons,  no microscopes.

```
GenomeGist
```

That's it. The name is the logo.

**Typography for logo:**
- Primary: JetBrains Mono, IBM Plex Mono, or similar monospace
- Weight: Medium (500)
- Optional subtle treatment: "Genome" in regular weight, "Gist" in bold

**Alternative minimal mark (for favicon, small spaces):**
- `GG` monogram in monospace
- Or: `{ }` brackets containing `GG` → `{GG}`

---

## Design Philosophy

### The "Old Bootstrap" Aesthetic

GenomeGist should feel like a well-made developer tool from 2014 — competent, straightforward, and respectful of the user's time. Think early Stripe documentation, GitHub Pages project sites, or single-purpose tools like jsonformatter.org.

This aesthetic signals credibility to our technical audience. It says: "This tool works. No gimmicks."

**Reference points:**
- Early Bootstrap sites (pre-4.0)
- GitHub project pages
- Hacker News
- Single-purpose dev utilities (carbon.now.sh, readme.so)
- Old Stripe docs

### Core Principles

1. **Function over form.** Every element should serve a purpose. If it doesn't help the user complete their task, remove it.

2. **Trust through transparency.** Plain language, technical specifics, and prominent privacy messaging. No marketing speak.

3. **One page, one job.** The entire app should fit on a single page. No wizards, no account creation, no navigation complexity.

4. **Quiet confidence.** The design shouldn't try to impress. It should get out of the way and let the tool speak for itself.

---

## Visual Direction

### Color Palette

Keep it simple and muted. Near-black text on white/off-white backgrounds. One accent color for interactive elements — either a standard link blue or a muted green (genomics association).

Avoid: Bright colors, gradients, dark mode (unless trivial to add later).

### Typography

Use system fonts. No custom display fonts, no font loading. Body text should be readable (16px minimum) with generous line-height. Code and technical content in monospace.

Avoid: Decorative fonts, small text, tight line-height.

### Spacing and Layout

Single column, centered, with a comfortable max-width (around 700-800px). Generous whitespace between sections. Mobile responsive but designed desktop-first.

Avoid: Sidebars, multi-column layouts, cramped spacing.

### Borders and Shadows

Minimal. Thin borders (1px) in light gray where needed for structure. No drop shadows, no glows, no rounded corners beyond subtle (2-4px max).

Avoid: Heavy borders, box shadows, pill-shaped buttons.

---

## Component Guidelines

### File Upload Zone

- Dashed border, light background
- Clear instructional text
- Drag-and-drop support with click fallback
- Lists supported formats
- No icons necessary, text is fine

### Progress Indicators

- Plain text status updates preferred
- If using a progress bar, keep it simple (no animations, no gradients)
- Show specific numbers when possible ("Found 642,317 variants")

### Buttons

- Solid, rectangular, minimal styling
- Primary action: dark background, light text
- Secondary action: light background, dark text with border
- No icons unless absolutely necessary

### Status Messages

- Plain text, inline with the flow
- Success: can use green text or checkmark
- Error: red text, clear explanation of what went wrong
- No toast notifications or modals

### Download Output

- Simple button or link
- Show file size
- Consider "Copy to clipboard" as secondary option

---

## Content Guidelines

### Tone of Voice

- Direct and concise
- Technical but accessible
- Slightly dry, not playful
- Confident without being boastful

### Writing Style

- Short paragraphs
- Bullet points for lists of features or specs
- Specific numbers over vague claims ("1,247 variants" not "thousands of variants")
- Active voice

### What to Emphasize

1. **Privacy** — Repeated, prominent. "Your data never leaves your device."
2. **Simplicity** — One tool, one job, done well.
3. **Technical credibility** — Name the data sources (ClinVar, PharmGKB, GWAS Catalog).
4. **AI-ready output** — This is the use case, make it clear.

### What to Avoid

- Marketing superlatives ("revolutionary," "game-changing")
- Vague claims ("trusted by thousands")
- Health advice or medical language
- Exclamation points
- Emojis in body copy (favicon is fine)

---

## Page Structure

The site should be a single page with clear sections:

1. **Header** — Name/logo (text only), maybe a one-line tagline
2. **Tool** — File upload, processing status, download
3. **Explanation** — What this tool does, in plain language
4. **Pricing** — Free tier vs paid, simple comparison
5. **Privacy** — Prominent section on data handling
6. **Footer** — Legal links, version info, attribution

No navigation needed — the page is short enough to scroll.

---

## Things to Avoid

| Element | Why |
|---------|-----|
| Hero images | Signals landing page, not utility tool |
| DNA helix graphics | Cliché, looks like consumer health app |
| Stock photos | Feels corporate |
| Testimonials | We're a utility, not a lifestyle brand |
| Social proof counters | "Join 10,000 users" feels salesy |
| Animated anything | Gradients, spinners, transitions — too polished |
| Chat widgets | Adds complexity, doesn't fit the vibe |
| Account creation | Tokens only, no login system |
| Multiple pages | Everything on one page |

---

## Implementation Notes

When building the site:

- Start with semantic HTML, add minimal CSS
- Avoid CSS frameworks unless they help achieve the "basic Bootstrap" look
- Test on mobile but don't over-optimize
- Keep JavaScript minimal (parsing logic is separate from UI chrome)
- Version number should be visible somewhere (footer is fine)

---

## Style Reference

> **For Claude Code:** Document specific style decisions here as you build. Include colors, font sizes, spacing values, and any component patterns established during development.

### Colors
```
Primary text:       #1a1a1a
Secondary text:     #555
Background:         #fff
Background alt:     #f8f9fa
Accent:             #0066cc
Accent hover:       #0052a3
Borders:            #ddd
Success:            #228b22
Error:              #cc0000
Code background:    #f5f5f5
```

### Typography
```
Font stack:         -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif
Monospace font:     ui-monospace, 'SF Mono', Menlo, Monaco, 'Cascadia Code', monospace
Base size:          16px
Line height:        1.6
H1 size:            2rem (32px)
H2 size:            1.25rem (20px)
H3 size:            1.1rem (17.6px)
```

### Spacing
```
Content max-width:  720px
Spacing xs:         0.5rem (8px)
Spacing sm:         1rem (16px)
Spacing md:         1.5rem (24px)
Spacing lg:         2rem (32px)
Spacing xl:         3rem (48px)
```

### Components
```
Button padding:     0.6rem 1.2rem
Button border-radius: 3px
Border width:       1px
Border radius:      3px
Upload zone border: 2px dashed
```

### Specific Decisions
```
- Dark buttons on light background (not accent-colored) for primary actions
- Status messages use left border accent (3px) instead of full border
- Upload zone uses dashed border with 2px width
- System fonts only, no web font loading
- Minimal transitions (0.15s) only on interactive elements
```
