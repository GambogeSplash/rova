# ROVA Design Direction — v3 (Espresso system, 1:1)

> **Register:** Espresso Systems aesthetic, applied to robotics.
> **One-liner:** _The settlement layer for robots that earn._
> Light, warm, deeply readable. Cream and espresso bean as the foundation, caramel amber as the action color, teal and forest green for status. Same system mechanics as [espressosys.com](https://www.espressosys.com).

---

## 1. Why this system

Espresso Systems sits in an adjacent niche (rollup confirmation/sequencing — picks-and-shovels for L2 builders) and has solved a brand problem we share: how to make serious onchain infrastructure feel calm, premium, and engineered rather than crypto-floofy. Borrowing their design system gives us a vocabulary that already reads as "credible infrastructure" to the technical audience we want (humanoid teams, Virtuals BD, Base PD).

**Trade-off accepted:** Anyone fluent in the L2 design landscape will read Rova as an Espresso-family product. We're choosing perceived credibility over visual originality. _If/when this becomes a problem, we shift to the "sibling" palette in `DESIGN-DIRECTION-V2-archived.md`._

---

## 2. Color (exact espresso hex)

### Foundation
| Token | Hex | Use |
|---|---|---|
| `paper` | `#FFFFFF` | Page background, default surface |
| `cream` | `#FCEBDE` | Section accent background, soft cards |
| `cream-soft` | `#FFF7EF` | Lighter cream surface variant |
| `bean` | `#270903` | Primary text, dark band background |
| `bean-soft` | `#451F17` | Secondary text |
| `slate` | `#758696` | Tertiary text, captions |

### Action (the only CTA color)
| Token | Hex | Use |
|---|---|---|
| `amber` | `#B67237` | Primary CTAs, links, active state |
| `amber-pressed` | `#9B5E2C` | Pressed/hover deepen |
| `amber-tint` | `#B6723712` | Ghost button bg, soft pill bg |

### Status (used sparingly)
| Token | Hex | Use |
|---|---|---|
| `teal` | `#0C81B4` | Live / in-progress / info |
| `forest` | `#3E7448` | Settled / proof verified / OK |
| `wheat` | `#F0E89D` | Pending / soft warning |

### Line work
| Token | Hex | Use |
|---|---|---|
| `line` | `#270903` | 1px hairlines on dark surfaces |
| `line-soft` | `#E8DCC9` | 1px on cream surfaces — warm-toned divider |
| `line-paper` | `#EDE5DC` | 1px on white surfaces |

---

## 3. Typography

**Target (production):** PP Neue Montreal (Pangram Pangram, paid) + Inter (Google Fonts) + IBM Plex Mono (Google Fonts).
**Demo stack (now):** Inter Tight + Inter + IBM Plex Mono — all free, Inter Tight is the closest free stand-in for PP Neue Montreal until we license.

**Scale**

| Token | Size (rem) | Line | Use |
|---|---|---|---|
| `display` | 4.5 / 5.5 | 1.02 | Hero |
| `h1` | 2.75 | 1.05 | Section heads |
| `h2` | 1.875 | 1.15 | Module heads |
| `h3` | 1.25 | 1.25 | Sub-modules |
| `body` | 1.0625 | 1.55 | Paragraphs (1.0625 — slightly larger than browser default, espresso pattern) |
| `data` | 0.875 | 1.4 | Plex Mono — addresses, IDs, prices |
| `caption` | 0.75 | 1.35 | Plex Mono — uppercase labels |

**Letter-spacing:** Display & h1 `-0.025em`. Caption `0.08em` uppercase.

---

## 4. Surfaces / Section pattern

Espresso alternates white ↔ cream sections to break a long page into legible chapters. Use this for Rova:

- **Hero** — white (paper)
- **Stats strip** — cream-soft (very light)
- **Protocol (how it works)** — white
- **Contracts data sheet** — cream (warmer break)
- **Three actors** — white
- **Eastworld Labs strip** — bean (espresso brown, paper-text inverted band)
- **Footer** — white

No drop shadows. Surface separation is done by background color + hairline `line-soft` borders.

---

## 5. Components

**Buttons**
- Primary: solid `amber` bg, white text, **4px radius**, no border, 14px height, no shadow.
- Secondary: 1px `bean` border, `bean` text, transparent bg.
- Tertiary: text-only with `link-hover` underline, `amber` color on hover.
- On bean bands: invert — paper border + paper text + transparent bg.

**Cards**
- White or cream bg, 1px `line-soft` or `line-paper` border, **0px radius** for spec-sheet sections, **6px radius** for interactive cards.
- No shadows.

**Tables / data sheets**
- Header row: `cream-soft` bg, mono uppercase 10px in `slate`.
- Body rows: white bg, hairline `line-soft` dividers.
- Numeric cols right-aligned, Plex Mono tabular.

**Status pills**
- 1px outline, 10px uppercase mono.
- `forest` (settled), `teal` (live), `wheat`-on-`bean-soft` (pending), `slate` (idle).

---

## 6. Motion

- Default ease: `[0.2, 0, 0, 1]`. Sharp.
- Duration: 180–220ms.
- **No glows, no gradients animating, no parallax.**
- Page enter: 12px y-shift + fade. 60ms max stagger.

---

## 7. Voice

Espresso pattern: short, declarative sentences. Two- or three-word taglines with periods between them ("Custom Chains. Connected Markets."). Adapt for Rova:

- **Tagline:** _The settlement layer for robots that earn._
- **Pillars (Espresso-style "01–04"):**
  - 01 Posted. _Agent calls registry, deposits bounty._
  - 02 Accepted. _Robot listens, signs attestation, begins execution._
  - 03 Proven. _GPS, timestamp, sensor hash submitted to verifier._
  - 04 Settled. _Escrow releases. Immutable record on Base._

**Metric callouts** (espresso pattern: stat + label, calm confidence):
- `127` jobs settled today
- `1.2s` median acceptance
- `0` counterparty failures since launch
- `218.4 USDC` payouts to robots, last 24h

---

## 8. What changes from v2

| | v2 (Boston Dynamics / Lab) | v3 (Espresso 1:1) |
|---|---|---|
| Bg | `#F4F4F2` warm off-white | `#FFFFFF` white + `#FCEBDE` cream alternation |
| Text | `#0F0F0F` near-black | `#270903` espresso bean (warm dark brown) |
| Accent | `#D43A1F` lab red | `#B67237` caramel amber |
| Dark band | `#0F0F0F` ink (cold) | `#270903` bean (warm) |
| Status | red-only | teal + forest + wheat |
| Borders | gray hairlines | warm-toned hairlines `#E8DCC9` |
| Voice | Boston Dynamics terse | Espresso declarative ("Posted. Accepted. Proven. Settled.") |

---

## 9. Brand-distance note

The first thing to add **above** the Espresso system if we want to feel like _Rova_ rather than _Espresso for robots_ is a single **proprietary visual artifact**:

- A schematic wordmark/mark with a robot-specific geometry (e.g. a square containing a centered dot — module-like, suggests a robot wallet)
- One signature schematic illustration on the hero (Unitree G1 silhouette in `bean` line work on cream)
- A photo treatment (sepia + cream tint over warehouse/robot photography) that becomes recognizable

Layer these on top, not instead.
