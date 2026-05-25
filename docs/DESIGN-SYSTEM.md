# DESIGN-SYSTEM

> The canonical design system. Espresso aesthetic applied to robotics infrastructure: cream + bean + amber, warm and engineered, never crypto-floofy.

Source of truth for tokens, type, motion, surfaces, components. The `DESIGN-DIRECTION-V3.md` file is the narrative; this is the spec engineers and designers build against.

---

## 1. Frame

Three sentences define the system, in priority order:

1. **Calm > loud.** White and cream surfaces alternated for chaptering. Hairline borders, not shadows. One CTA color (amber). Status colors used sparingly.
2. **Legibility > decoration.** Body text at 17px (1.0625rem). Monospace for every number, address, ID, and timestamp. Letter-spacing tightened only at display sizes.
3. **Engineered > generative.** Schematic illustrations (SVG line art), not stock 3D. Data tables instead of marketing cards. Receipts instead of charts where possible.

If a design decision violates any of these three, it's wrong.

---

## 2. Color tokens

### Foundation

| Token         | Hex       | Use                                                |
| ------------- | --------- | -------------------------------------------------- |
| `paper`       | `#FFFFFF` | Page background, default surface                   |
| `cream`       | `#FCEBDE` | Section accent background, soft cards              |
| `cream-soft` | `#FFF7EF` | Lighter cream surface variant                      |
| `bean`        | `#270903` | Primary text, dark band background                 |
| `bean-soft`  | `#451F17` | Secondary text                                     |
| `slate`       | `#758696` | Tertiary text, captions                            |

### Action (only one CTA color)

| Token            | Hex         | Use                                |
| ---------------- | ----------- | ---------------------------------- |
| `amber`          | `#B67237`   | Primary CTAs, links, active state  |
| `amber-pressed` | `#9B5E2C`   | Pressed/hover deepen               |
| `amber-tint`    | `#B6723712` | Ghost button bg, soft pill bg      |

### Status (used sparingly — semantics, not decoration)

| Token  | Hex       | Semantic                            |
| ------ | --------- | ----------------------------------- |
| `teal`  | `#0C81B4` | Live / in-progress / info           |
| `forest` | `#3E7448` | Settled / proof verified / OK       |
| `wheat`  | `#F0E89D` | Pending / soft warning              |
| `alert` | `#C0392B` | Failure / dispute / slashing event  |

### Line work

| Token         | Hex       | Use                                       |
| ------------- | --------- | ----------------------------------------- |
| `line`        | `#270903` | 1 px hairlines on dark surfaces           |
| `line-soft`  | `#E8DCC9` | 1 px on cream surfaces (warm divider)     |
| `line-paper` | `#EDE5DC` | 1 px on white surfaces                    |

Hairlines never exceed 1 px. Border-radius defaults to `4 px` for inputs and `8 px` for surfaces; never `0` (looks crypto), never `≥ 16 px` (looks consumer).

### Dark surfaces (operator dashboard, simulator)

A separate sibling palette for surfaces that need to live in dark mode (the in-product Operator dashboard and `/simulator` are dark). These map to the light palette by role, not hex:

| Light token | Dark equivalent | Hex (dark)    |
| ----------- | --------------- | ------------- |
| `paper`     | `background`    | `#080808`     |
| `cream`     | `surface-1`     | `#121212`     |
| `bean`      | `text-primary`  | `#EDE5DC`     |
| `slate`     | `text-tertiary` | `#758696`     |
| `amber`     | `accent`        | `#EF6F2E`     |
| `teal`      | `teal`          | `#0C81B4`     |
| `forest`    | `forest`        | `#3E7448`     |
| `alert`     | `alert`         | `#EF4444`     |

The dark palette is *not* a "dark mode toggle" on the marketing site — it's the chrome the product lives in. Marketing + receipts use light. Operator + simulator use dark.

---

## 3. Typography

**Target (production):** PP Neue Montreal (Pangram Pangram, paid licence) + Inter (Google) + IBM Plex Mono (Google).
**Stand-in (current):** Inter Tight + Inter + IBM Plex Mono — Inter Tight is the closest free analog to PP Neue Montreal.

### Scale

| Token     | Size (rem) | Line  | Letter-spacing | Use                                       |
| --------- | ---------- | ----- | -------------- | ----------------------------------------- |
| `display` | 4.5 → 5.5  | 1.02  | -0.025 em      | Hero only                                 |
| `h1`      | 2.75       | 1.05  | -0.025 em      | Section heads                             |
| `h2`      | 1.875      | 1.15  | -0.015 em      | Module heads                              |
| `h3`      | 1.25       | 1.25  | -0.005 em      | Sub-module heads                          |
| `body`    | 1.0625     | 1.55  | 0              | Paragraphs (slightly larger than browser default — espresso pattern) |
| `data`    | 0.875      | 1.4   | 0              | Plex Mono — addresses, IDs, prices        |
| `caption` | 0.75       | 1.35  | 0.08 em upper  | Plex Mono — uppercase labels              |

### When to use mono

Mono (Plex) is for: addresses, transaction hashes, IDs, prices, timestamps, GPS coords, sensor hashes, status strings, file paths, contract method names.

Mono is **not** for: body copy, headings, button labels, section names.

If you can't tell whether something should be mono, ask: "Does this represent a value the user might copy or compare digit-by-digit?" If yes, mono.

---

## 4. Surfaces and chaptering

The marketing site alternates white and cream sections to break long pages into chapters:

```
Hero            ← paper
Stats strip     ← cream-soft
Protocol        ← paper
Contracts       ← cream
Receipts        ← paper
Partners        ← cream-soft
Footer          ← bean (dark, reversed)
```

Each section is ~720–900 px tall on desktop, with a `max-w-[1280px]` content column. Section padding `py-20 lg:py-28` (160 px). No section ever uses two cream backgrounds in a row.

### Card vs section vs raw

| Form          | When                                                |
| ------------- | --------------------------------------------------- |
| **Raw**       | Default — text on the section surface, no container |
| **Card**      | `bg-surface-0 border border-line-paper rounded-lg p-5` — surfaces a single related cluster (a stat block, a feature) |
| **Section container** | `bg-cream-soft rounded-2xl p-8 lg:p-10` — wraps a multi-card module on a paper section |

Avoid 3+ levels of nesting. Card inside section inside section is wrong — collapse one level.

---

## 5. Spacing

8 px grid. All padding and gaps use multiples of `4` (sub-grid) or `8` (grid).

| Unit | Tailwind  | Where                                          |
| ---- | --------- | ---------------------------------------------- |
| 4 px  | `1`       | Inline icon gaps                               |
| 8 px  | `2`       | Tag chip padding, small stack gap              |
| 16 px | `4`       | Default vertical rhythm inside cards           |
| 24 px | `6`       | Card-to-card gap                               |
| 32 px | `8`       | Module-to-module gap                           |
| 48 px | `12`      | Section break (inside a page)                  |
| 64 px | `16`      | Major break (page-level)                       |
| 160 px | `40`      | Section padding vertical (`py-20 lg:py-28`)    |

---

## 6. Motion

Three motion primitives — nothing else allowed without spec extension.

### A. `enter` — element appears

```ts
{ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
```

Use for: list items entering, cards appearing, panels sliding in.

### B. `transition` — state change in place

```ts
{ duration: 0.2, ease: "easeOut" }
```

Use for: hover states, color transitions, accent emphasis.

### C. `spring` — interactive feedback

```ts
{ type: "spring", damping: 22, stiffness: 240 }
```

Use for: drag, drawer slide, modal open, sortable list rearrange.

**Never use:** parallax scroll, hero video, looped marketing motion. The site reads as a piece of infrastructure, not a product launch trailer.

---

## 7. Component vocabulary

Primitives live in `src/components/Primitives.tsx`. Component specs in `COMPONENTS/*.md`. Brief list:

### Type primitives
- **Eyebrow** — `caption` size, uppercase, `slate` color. Pre-label above a heading.
- **SectionLabel** — `caption` size, uppercase, with a leading 7 px amber dot. Pre-label above a section.
- **HairlineHeader** — section heading with a 1 px line below.
- **MonoNum** — wraps numeric data in mono; right-aligned in tables, tabular-numbers feature on.
- **AmberLink** — text link in amber, underline on hover.

### Status primitives
- **StatusPill** — small uppercase chip, color-coded by status enum.
- **Dot** — 7 px colored circle; status indicator.
- **AddressChip** — truncated `0x71C7…4e2F`-style display, click-to-copy.

### Layout primitives
- **DataRow** — label + value horizontal row with dotted underline between them; used in receipts, settings.
- **StatCard** — large number + small label + optional delta arrow. The most common card on dashboards.
- **Kbd** — keyboard-shortcut display chip, `⌘K`.

Every primitive has a single visual variant. If you need a "different size StatCard", you have a new component, not a variant. Variants metastasize; new components stay legible.

---

## 8. Iconography

Custom schematic line-work in `src/components/Icons.tsx`. **No third-party icon library.** No Lucide, no Phosphor, no Heroicons.

Why: every commercial icon set is recognizable to designers; using one immediately reads as "they used [X]". Custom schematics in the line-work style match the espresso engineered feel.

Rules for new icons:
- 24 × 24 viewBox
- 1.5 px stroke at 24 px, scales proportionally
- `currentColor` stroke, no fills
- One semantic concept per icon — don't combine

Existing icons: `RobotIcon`, `AgentIcon`, `OperatorIcon`, `WalletIcon`, `LockIcon`, `PinIcon`, `BatteryIcon`, `WarehouseSchematic`, `ProtocolFlowSchematic`.

---

## 9. Imagery and illustration

There are no photographs in Rova marketing surfaces. No 3D renders. No generated AI imagery.

Illustration style is **schematic** — SVG line art, espresso color, technical-drafting register. Examples:
- `WarehouseSchematic` — top-down warehouse with shelves, dispatch bays, charging station. Used in hero.
- `ProtocolFlowSchematic` — agent → robot → verifier → settlement flow diagram. Used in "How it works."

If a future surface needs imagery, draw it in this style or omit it. A blank section with strong typography is always better than a section with a stock photo.

---

## 10. Tone

Marketing copy and microcopy follow `COPY/MICROCOPY.md`, but the underlying tone rule is:

**Write like the protocol, not like a startup.** Specific, declarative, low-adjective.

Good: *"Robot completes task. Proof verifies. Escrow releases."*
Bad: *"A revolutionary new way to coordinate the robotics economy."*

Good: *"Set price floor in USDC."*
Bad: *"Configure your fleet's earning preferences with our intuitive policy authoring tool."*

If a sentence could appear in any infrastructure pitch deck without modification, rewrite it.

---

## 11. Accessibility

Targets:
- WCAG AA contrast on all text (4.5:1 normal, 3:1 large)
- All interactive elements ≥ 44 × 44 px hit area on mobile
- Focus-visible outline always present (`outline-2 outline-amber outline-offset-2`)
- Reduced-motion respect: motion primitives B (`transition`) drop duration to 0 with `prefers-reduced-motion`
- All status conveyed by both color *and* shape/text (color-blind friendly)

Tests are not optional — the dashboard has 200+ status pills and 30+ interactive controls. Run axe-core in CI.

---

## 12. What's intentionally omitted

To keep the system small:

- **Gradients.** Solid colors only.
- **Drop shadows.** Hairline borders only. (Exception: floating modal/drawer uses `shadow-2xl` for hierarchy.)
- **Glow effects.** No accent halos around buttons.
- **Animated emoji.** No emoji at all in product UI.
- **Multiple fonts beyond the three.** No "modern serif accent" or "casual script" anywhere.
- **Multiple shapes.** Rectangles + circles + hairline divisions. No hexagons, no swooshes, no organic blobs.

When a future page wants a glow or a hex, the answer is to use one of the three motion primitives or one of the existing surface patterns. The system stays small on purpose.

---

## Related

- `DESIGN-DIRECTION-V3.md` — the narrative origin and rationale for the espresso choice
- `IA.md` — URL map and three-actor navigation rules
- `COPY/MICROCOPY.md` — every button label and error string
- `COMPONENTS/*.md` — per-component visual + behavior specs
