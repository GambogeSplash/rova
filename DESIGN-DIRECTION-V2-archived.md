# ROVA Design Direction — v2

> **Register:** Boston Dynamics / Lab.
> **One-liner:** _The settlement layer for robots that earn._
> Picks-and-shovels for the embodied-AI economy. Reads like a robotics company that happens to settle onchain, not a crypto company that happens to use robots.

---

## 1. Identity

**Audience first.** Humanoid engineers, embodied-AI researchers, robotics ops, Virtuals BD, Base PD. They are skeptical of crypto-floofy aesthetics and respond to engineering rigor, spec sheets, and demonstrated physical work.

**Personality:** Engineered. Specific. Quiet. Earned-confident.
**Voice register:** Boston Dynamics + Stripe. Verbs first. No marketing fluff. Specs over slogans.
**Visual register:** White lab walls. Photo-led. Hairline borders. Generous gutters. Schematic line drawings. Data sheets.

**Do**
- Show the robot. Show the receipt. Show the proof.
- Use Plex Mono for any number, address, hash, hex, or job ID.
- Treat every page as a spec sheet for one idea.

**Don't**
- Gradients, glows, neon, noise grain, mouse-tracking shimmer.
- Crypto color tropes (purple→pink hero gradient, neon green, electric blue).
- "Revolutionizing" / "disrupting" / "the future of" copy.

---

## 2. Color System

### Foundation (light)
| Token | Hex | Usage |
|---|---|---|
| `paper` | `#F4F4F2` | Page background — warm off-white, like lab paper |
| `surface` | `#FFFFFF` | Cards, panels, elevated surfaces |
| `ink` | `#0F0F0F` | Primary text, headlines, schematic line work |
| `graphite` | `#8A8A88` | Secondary text, captions, axis labels |
| `mist` | `#C9C9C7` | Tertiary text, disabled, very light separation |

### Signal
| Token | Hex | Usage |
|---|---|---|
| `signal` | `#D43A1F` | Lab red — primary CTA, live status, escrow released, "operational" |
| `signal-pressed` | `#B12E15` | CTA pressed state |
| `signal-tint` | `#D43A1F12` | Ghost button bg, soft pill bg |

### Line work
| Token | Hex | Usage |
|---|---|---|
| `line` | `#1F1F1F` | 1px hairlines on key data structures (tables, dividers in spec sheets) |
| `line-soft` | `#E4E4E2` | 1px separators in lists, default card borders |

### Semantic
| Token | Hex | Usage |
|---|---|---|
| `ok` | `#0F7A3D` | Job completed, proof verified, escrow released |
| `warn` | `#B47100` | SLA at risk, proof pending |
| `alert` | `#D43A1F` | Job failed, slashed, fault — same as signal (intentional) |

**Why one bright accent and not two:** A single signal color makes every red element load-bearing. Red here means: live, escrowed, attention, settled — i.e., *moments that matter*. Everything else is grayscale. This is the Stripe / Boston Dynamics discipline.

---

## 3. Typography

**Sans — `Inter Tight`** (Google Fonts, free).
- Closer to Söhne than regular Inter. Tighter apertures, slightly mechanical.
- Weights used: 400 (body), 500 (UI), 600 (headings), 700 sparingly.

**Mono — `IBM Plex Mono`** (Google Fonts, free).
- All numbers, addresses, hashes, job IDs, contract names, kbd-style hotkeys.
- Weights used: 400, 500.

**Scale (rem)**

| Token | Size | Line | Use |
|---|---|---|---|
| `display` | 4.5 / 5.5 | 1.0 | Hero / page-title pages |
| `h1` | 2.75 | 1.05 | Section heads |
| `h2` | 1.875 | 1.15 | Card heads, named modules |
| `h3` | 1.25 | 1.25 | Sub-modules |
| `body` | 1.0 | 1.55 | Paragraphs |
| `data` | 0.875 | 1.4 | Plex Mono — addresses, prices, IDs |
| `caption` | 0.75 | 1.35 | Plex Mono — axis labels, captions, status |

**Letter-spacing:** Display & h1 set `-0.02em`. Caption set `0.05em` uppercase.

---

## 4. Components

**Buttons**
- Primary: solid `ink` bg, `paper` text, 4px radius, 1px `line` border, 14px height, no shadow.
- Signal: solid `signal` bg, white text, 4px radius. Use only for the *single* action that releases value (Hire Robot, Confirm Job, Release Escrow).
- Ghost: 1px `line-soft` border, `ink` text, transparent bg.

**Cards**
- `surface` bg, 1px `line-soft` border, **0px radius** for spec-sheet sections; **6px radius** for interactive cards.
- No shadows. Ever. Use hairlines for separation.

**Tables / Data sheets**
- Mono headers in `graphite`, uppercase, 11px, tracking-wide.
- Hairline `line-soft` dividers between rows.
- Numeric columns right-aligned in Plex Mono.

**Status pills**
- 1px outlined, uppercase mono 10px.
- Color codes: `ok` (online/settled), `signal` (live/in-progress), `warn` (pending), `graphite` (idle/draft).

**Schematic illustrations**
- 1px `ink` strokes on `paper` bg.
- Subjects: Unitree G1 silhouette, manipulator arms, GPS pin, escrow lockbox, motion paths, factory floor plan top-down.
- Use SVG, not raster. Crisp at all sizes.

---

## 5. Layout

- Page max-width: **1240px**. Side gutters: 32px desktop / 20px mobile.
- Hero band: 80vh, asymmetric grid — copy left, schematic/photo right.
- Section break: `line` 1px hairline rule across full container width + 96px top margin.
- "Spec sheet" sections: 2-column grid, left col is a uppercase mono section label, right col is the content. Like the side notes in a Stripe doc page.

---

## 6. Motion

- Default ease: `[0.2, 0, 0, 1]`. Sharp, decisive — robot servo, not jelly.
- Duration: 180–240ms. Faster than the current build.
- **No glow**, no scale-pulse, no shimmer skeletons, no mouse-tracking radial.
- Loading: stepped progress bar (1px ink), not infinite spinners.
- Page enter: 12px y-shift + opacity fade. No stagger longer than 60ms.

---

## 7. Voice / Copy

- Lead with verbs and numbers.
- "Robot accepted job in 1.2s" beats "Lightning-fast acceptance".
- Section labels are nouns in uppercase mono: `REGISTRY`, `MARKET`, `VERIFIER`, `WALLET`.
- Tagline candidates:
  - _The settlement layer for robots that earn._
  - _ACP, extended to the physical world._
  - _Job posted → robot accepts → proof verified → escrow released._

---

## 8. Hero canvas (landing)

Replace the current gradient/glow hero with one of:
- **Option A:** A single high-resolution photo of a Unitree G1 mid-task on a neutral floor, ROVA wordmark + tagline laid over generous white space.
- **Option B:** SVG schematic — top-down floor plan of a warehouse with three labeled job markers (`JOB#001 RUNNING`, `JOB#042 PROOF SUBMITTED`, `JOB#108 SETTLED`) connected by motion paths.
- **Option C:** A data sheet — "ROVA G1 OPERATING PARAMETERS" with mono columns of specs (payload, range, ACP version, settlement layer, etc.).

Start with C (no assets needed), add A or B as v2.

---

## 9. What changes from v1

| | v1 (Factory.ai-inspired dark) | v2 (Boston Dynamics / Lab) |
|---|---|---|
| Mode | Dark `#020202` | Light `#F4F4F2` |
| Accent | Warm orange `#EF6F2E` | Lab red `#D43A1F` |
| Type | Geist + Geist Mono | Inter Tight + IBM Plex Mono |
| Texture | Noise grain, mouse-tracking glow, beam border | Hairlines, schematic SVG, generous white |
| Cards | Rounded 24/32px, glow on hover | 0px (spec) / 6px (interactive), 1px line border |
| Voice | "Bloomberg Terminal meets…" | "The settlement layer for robots that earn." |
| Audience read | Crypto trader | Robotics engineer |
