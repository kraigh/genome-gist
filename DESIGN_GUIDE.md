# GenomeGist Design Guide

## Brand Identity

**Name:** GenomeGist

**Tagline:** Extract the gist of your genome.

**What it is:** A no-frills utility tool that extracts clinically relevant genetic variants from raw genome files. Built for people who want to analyze their data with AI tools.

**What it's not:** A health platform, medical service, consumer wellness app, or slick startup.

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

## Logo and Favicon

**Logo:** Text only. The name "GenomeGist" in a clean sans-serif font is sufficient. No graphic mark needed.

If a more stylized version is desired, consider a monospace treatment like `[genome:gist]` but this is optional.

**Favicon:** Keep it simple. A 🧬 emoji works, or a simple letter "G" in the brand color.

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
(To be filled in during development)

Primary text:       
Secondary text:     
Background:         
Accent:             
Borders:            
Success:            
Error:              
Code background:    
```

### Typography
```
(To be filled in during development)

Font stack:         
Base size:          
Line height:        
Heading sizes:      
Monospace font:     
```

### Spacing
```
(To be filled in during development)

Content max-width:  
Section padding:    
Element margins:    
```

### Components
```
(To be filled in during development)

Button padding:     
Button border-radius:
Input padding:      
Border width:       
Border radius:      
```

### Specific Decisions
```
(Document any design decisions or patterns established during development)

- 
- 
- 
```
