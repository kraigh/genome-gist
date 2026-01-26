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

### Clean, Professional Utility

GenomeGist should feel like a modern, polished developer tool — sleek without being flashy, professional without being corporate. Think Linear, Vercel, or Stripe's current documentation. The design should feel refined and purposeful.

This aesthetic signals credibility to our technical audience. It says: "Built with care. Works reliably."

**Reference points:**
- Linear (clean, modern SaaS)
- Vercel dashboard
- Modern Stripe docs
- GitHub's current design system
- Raycast, Arc browser

### Core Principles

1. **Function over form.** Every element should serve a purpose. If it doesn't help the user complete their task, remove it.

2. **Trust through transparency.** Plain language, technical specifics, and prominent privacy messaging. No marketing speak.

3. **One page, one job.** The entire app should fit on a single page. No wizards, no account creation, no navigation complexity.

4. **Quiet confidence.** The design shouldn't try to impress. It should get out of the way and let the tool speak for itself.

---

## Visual Direction

### Color Palette

Clean and purposeful. Use a restrained palette with good contrast. Primary text should be dark enough for easy reading. Use a teal/science accent color that feels modern and trustworthy. Subtle gradients and backgrounds can add polish without distraction.

Avoid: Garish colors, excessive gradients, low-contrast text.

### Typography

Use a clean, modern sans-serif like Inter or system fonts. Body text should be readable (16px minimum) with generous line-height. Code and technical content in monospace. Font weights should provide clear visual hierarchy.

Avoid: Decorative fonts, small text, tight line-height, low font weights on body text.

### Spacing and Layout

Single column, centered, with a comfortable max-width (around 700-800px). Generous whitespace between sections. Mobile responsive but designed desktop-first.

Avoid: Sidebars, multi-column layouts, cramped spacing.

### Borders and Shadows

Refined and subtle. Use soft shadows to create depth and card separation. Rounded corners (6-16px) give a modern, approachable feel. Borders should be light but visible enough to define structure.

Avoid: Heavy drop shadows, excessive glow effects, overly rounded "pill" shapes on non-pill elements.

---

## Component Guidelines

### File Upload Zone

- Dashed border, light background
- Clear instructional text
- Drag-and-drop support with click fallback
- Lists supported formats
- No icons necessary, text is fine

### Progress Indicators

- Clean spinner or progress indicator with monospace status text
- Show specific numbers when possible ("Found 642,317 variants")
- Subtle animations are acceptable for loading states

### Buttons

- Clean, modern styling with subtle gradients and shadows
- Primary action: accent color background with subtle gradient, light text
- Secondary action: light background, dark text with border
- Icons can enhance clarity; use SVG icons sparingly and consistently
- Hover states should feel responsive (subtle lift, color shift)

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
| Excessive animation | Keep transitions subtle and purposeful |
| Chat widgets | Adds complexity, doesn't fit the vibe |
| Account creation | Tokens only, no login system |
| Multiple pages | Everything on one page |

---

## Implementation Notes

When building the site:

- Start with semantic HTML, use CSS custom properties for theming
- Keep the CSS organized with clear design tokens
- Test on mobile but design desktop-first
- Keep JavaScript minimal (parsing logic is separate from UI chrome)
- Version number should be visible somewhere (footer is fine)

---

## Style Reference

> **For Claude Code:** Document specific style decisions here as you build. Include colors, font sizes, spacing values, and any component patterns established during development.

### Colors
```
Primary (teal):     #0d9488
Primary light:      #14b8a6
Primary dark:       #0f766e
Primary bg:         #f0fdfa

Primary text:       #1e293b
Secondary text:     #475569
Muted text:         #64748b

Background:         #f8fafc
Surface (cards):    #ffffff
Border:             #cbd5e1
Border light:       #e2e8f0

Success:            #10b981
Success bg:         #ecfdf5
Error:              #ef4444
Error bg:           #fef2f2
```

### Typography
```
Font stack:         'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
Monospace font:     ui-monospace, 'SF Mono', Menlo, Monaco, 'Cascadia Code', monospace
Base size:          16px (1rem)
Line height:        1.6
H1 size:            2rem (32px)
H2 size:            1.25rem (20px)
H3 size:            1rem (16px)
Small text:         0.875rem (14px)
```

### Spacing
```
Content max-width:  760px
Spacing xs:         0.5rem (8px)
Spacing sm:         0.75rem (12px)
Spacing md:         1rem (16px)
Spacing lg:         1.5rem (24px)
Spacing xl:         2rem (32px)
Spacing 2xl:        3rem (48px)
```

### Effects
```
Border radius sm:   6px
Border radius md:   10px
Border radius lg:   16px

Shadow sm:          0 1px 2px rgba(0, 0, 0, 0.05)
Shadow md:          0 4px 6px -1px rgba(0, 0, 0, 0.07)
Shadow lg:          0 10px 15px -3px rgba(0, 0, 0, 0.08)

Transitions:        150-300ms ease
```

### Specific Decisions
```
- Teal accent color throughout for brand consistency
- Cards with soft shadows for depth and separation
- Gradient backgrounds (subtle) for visual interest
- Primary buttons use gradient with hover lift effect
- Upload zone uses dashed border that transitions to solid on drag
- Inter font for modern, readable typography
- Subtle transitions on all interactive elements
```
