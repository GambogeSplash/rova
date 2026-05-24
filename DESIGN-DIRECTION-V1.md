# ROVA Design Direction
## Robotics + Web3 Marketplace -- Comprehensive Design System & Reference Guide

---

## 1. DESIGN IDENTITY: THE ROVA AESTHETIC

ROVA sits at the intersection of two design worlds: **industrial robotics** (precision, mechanical trust, physical presence) and **Web3 finance** (transparency, speed, digital-native). The design should feel like **a control center for the future of robotic labor** -- serious enough for institutional operators, compelling enough for retail participants.

**Personality Keywords:** Engineered, Autonomous, Precise, Electric, Institutional, Alive

**The One-Liner:** "Bloomberg Terminal meets Boston Dynamics showroom, tokenized."

---

## 2. COLOR SYSTEM

### Primary Palette (Dark Foundation)

| Token            | Hex       | Usage                                    |
|------------------|-----------|------------------------------------------|
| `base-0`         | `#08090B` | Page background, deepest layer           |
| `base-1`         | `#111316` | Card backgrounds, panels                 |
| `base-2`         | `#1A1D22` | Elevated surfaces, hover states          |
| `base-3`         | `#24282F` | Active surfaces, selected states         |
| `base-4`         | `#2E333B` | Borders (subtle), dividers               |

**Why near-black, not pure black:** Pure `#000` causes OLED "black smear" motion blur and feels hollow. Near-black (#08090B) gives depth for glow effects to breathe against. This is the Linear/Vercel/Hyperliquid approach.

### Accent: Electric Cyan (Primary Brand)

| Token            | Hex       | Usage                                    |
|------------------|-----------|------------------------------------------|
| `accent`         | `#00E5FF` | Primary CTA, active indicators, links    |
| `accent-muted`   | `#00B8D4` | Secondary emphasis, hover states         |
| `accent-subtle`  | `#00E5FF12` | Background tint, ghost buttons          |
| `accent-glow`    | `#00E5FF40` | Box-shadow glow, radial backgrounds     |

**Why cyan over green/purple:** Cyan reads as "electric" and "robotic" -- it's the color of HUDs, diagnostic screens, and servo feedback lights. It's less overused than neon green (crypto) or purple (DeFi). Cosmos.network and EigenLayer both gravitate toward cool tones for institutional trust.

### Semantic Colors

| Token            | Hex       | Usage                                    |
|------------------|-----------|------------------------------------------|
| `success`        | `#34D399` | Positive values, online status, confirm  |
| `danger`         | `#F87171` | Errors, negative values, destructive     |
| `warning`        | `#FBBF24` | Caution, pending states                  |
| `info`           | `#60A5FA` | Informational, neutral highlights        |

### Text Hierarchy

| Token            | Hex       | Usage                                    |
|------------------|-----------|------------------------------------------|
| `text-primary`   | `#F0F2F5` | Headlines, primary content               |
| `text-secondary` | `#A0A8B4` | Body copy, descriptions                  |
| `text-tertiary`  | `#6B7280` | Captions, metadata, timestamps           |
| `text-disabled`  | `#4B5563` | Disabled elements                        |

### Gradient System

```css
/* Hero gradient -- ambient glow behind key sections */
--gradient-hero: radial-gradient(ellipse 80% 50% at 50% -20%, #00E5FF15, transparent);

/* Card hover glow */
--gradient-card-glow: radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), #00E5FF08, transparent 40%);

/* Accent gradient for CTAs and featured elements */
--gradient-accent: linear-gradient(135deg, #00E5FF, #7C3AED);

/* Mesh gradient for hero backgrounds (use with noise overlay) */
--gradient-mesh: radial-gradient(at 20% 80%, #00E5FF10 0%, transparent 50%),
                 radial-gradient(at 80% 20%, #7C3AED10 0%, transparent 50%),
                 radial-gradient(at 50% 50%, #00E5FF05 0%, transparent 70%);
```

**Technique from Vercel/Stripe:** Gradients are AMBIENT, not decorative. They simulate light sources, as if the interface is lit from behind. Add SVG noise texture at 3-5% opacity to prevent gradient banding.

---

## 3. TYPOGRAPHY

### Font Stack

| Role        | Font                     | Weight       | Usage                         |
|-------------|--------------------------|--------------|-------------------------------|
| **Display** | `Space Grotesk`          | 500, 700     | Hero headlines, page titles   |
| **UI**      | `Inter`                  | 400, 500, 600| Body, labels, navigation      |
| **Mono**    | `JetBrains Mono`         | 400, 500     | Addresses, hashes, numbers, code |

**Why Space Grotesk:** It's geometric and mechanical (robotics personality) but warmer than IBM Plex. It has that "engineered" feel without being cold. Linear uses Inter Display for headlines; Space Grotesk gives ROVA its own identity while serving the same function.

**Why Inter for UI:** Industry standard for dense interfaces. Linear, Vercel, Railway, and Hyperliquid all use it. LCH color space compatibility makes it render crisply across dark themes.

**Why JetBrains Mono for data:** Tabular numerals, clear distinction between 0/O and 1/l. Essential for wallet addresses, token amounts, contract data.

### Type Scale

```
text-hero:    48px / 56px line-height / -0.02em tracking / Space Grotesk 700
text-h1:      36px / 44px / -0.02em / Space Grotesk 700
text-h2:      28px / 36px / -0.015em / Space Grotesk 600
text-h3:      22px / 28px / -0.01em / Space Grotesk 500
text-body-lg: 16px / 24px / 0 / Inter 400
text-body:    14px / 20px / 0 / Inter 400
text-caption: 12px / 16px / 0.01em / Inter 500
text-mono:    13px / 18px / 0 / JetBrains Mono 400
text-mono-sm: 11px / 16px / 0.02em / JetBrains Mono 400
```

**All text: `antialiased` (`-webkit-font-smoothing: antialiased`).** This is non-negotiable for dark UIs.

---

## 4. LAYOUT PATTERNS

### From Reference Sites

**Linear -- Command-Driven Layout:**
- Cmd+K command palette as primary navigation paradigm
- Minimal chrome -- content takes 90%+ of viewport
- Side panels slide in from right, never full-page modals
- Tabs are flush with content, not boxed

**Hyperliquid -- Information Density:**
- Three-column layout for trading: sidebar / main chart+controls / positions
- Collapsible panels for progressive disclosure
- Data tables with monospace numbers, row hover highlights
- Sticky headers that compress on scroll

**Vercel -- Breathing Room:**
- Generous whitespace between sections (80-120px)
- Cards with subtle borders (`1px solid rgba(255,255,255,0.06)`)
- Content max-width: 1200px, centered

**Railway -- Developer Density:**
- Dashboard grid with real-time status indicators
- Compact cards with status dots and inline metrics
- Dark sidebar with icon-first navigation

### ROVA Layout Recommendations

```
+------------------------------------------------------------------+
|  Top Bar: Logo | Search (Cmd+K) | Network Status | Wallet        |
+------+-----------------------------------------------------------+
|      |  Sub-header: Breadcrumb / Tabs / Filters                   |
| Side |------------------------------------------------------------+
| bar  |                                                            |
|      |  Main Content Area                                         |
| Icon |  - Marketplace grid (robot listings)                       |
| +    |  - Dashboard panels                                        |
| Text |  - Detail views                                            |
|      |                                                            |
|      +------------------------------------------------------------+
|      |  Status Bar: Gas | Block | Connection Status               |
+------+------------------------------------------------------------+
```

- **Sidebar:** 64px collapsed (icons only), 240px expanded, with smooth width transition (300ms ease)
- **Content max-width:** 1440px for marketplace grid, 1200px for detail/form pages
- **Card grid:** CSS Grid with `auto-fill, minmax(320px, 1fr)`, 16px gap
- **Breakpoints:** 640 / 768 / 1024 / 1280 / 1536 (Tailwind defaults)

---

## 5. COMPONENT DESIGN PATTERNS

### Cards (Robot Listings, Marketplace Items)

```
- Background: base-1
- Border: 1px solid base-4 (or transparent, border on hover)
- Border-radius: 16px
- Padding: 20px
- Hover: border-color transitions to accent-subtle,
         radial glow follows cursor position (JS mouse tracking)
- Transition: border-color 200ms ease, box-shadow 300ms ease
- Active/Selected: accent-subtle border, left accent bar (3px)
```

**Steal from Linear:** Cards are containers, not decorations. No gradients on cards themselves. The glow is the personality.

**Steal from Vercel:** Mouse-tracking radial gradient on card hover:
```tsx
// Track mouse position relative to card
onMouseMove={(e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
}}
// CSS: background: radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), #00E5FF06, transparent 40%);
```

### Buttons

| Variant        | Style                                                    |
|----------------|----------------------------------------------------------|
| `primary`      | `bg-accent text-base-0 font-medium`, hover: brightness 110% |
| `secondary`    | `bg-base-2 text-text-primary border border-base-4`, hover: bg-base-3 |
| `ghost`        | `bg-transparent text-text-secondary`, hover: bg-base-2   |
| `danger`       | `bg-danger/10 text-danger border border-danger/20`       |
| `connect`      | Gradient border (accent gradient), transparent bg         |

All buttons: `rounded-lg` (8px), `h-9 px-4`, `transition-all duration-150`, `active:scale-[0.97]`

**Magnetic Button Effect (from Stripe):**
```tsx
// On hover, button subtly shifts toward cursor
// Strength: 0.1 (subtle) -- never more than 4px displacement
// Use motion-primitives or custom Framer Motion spring
```

### Inputs & Forms

- Background: `base-0` (darker than card surface for depth)
- Border: `1px solid base-4`, focus: `accent` with `0 0 0 3px accent-subtle` ring
- Height: 40px
- Border-radius: 8px
- Placeholder: `text-tertiary`
- Labels: `text-caption`, `text-secondary`, uppercase optional for form groups

### Data Tables

- Header: `text-caption text-tertiary uppercase tracking-wider`, sticky
- Rows: `border-b border-base-4/50`, hover: `bg-base-2`
- Numbers: `font-mono text-mono` (JetBrains Mono)
- Positive/negative: `text-success` / `text-danger`
- Alignment: text left, numbers right

### Status Indicators

```
Online/Active:  8px circle, bg-success, with subtle pulse animation (2s infinite)
Offline:        8px circle, bg-base-4
Pending:        8px circle, bg-warning, with slow rotation
Error:          8px circle, bg-danger
```

---

## 6. ANIMATION & MICRO-INTERACTION SYSTEM

### Stack: Framer Motion (primary) + GSAP (scroll/complex) + Lenis (smooth scroll)

**Why this combo:** Framer Motion handles React component state transitions natively. GSAP + ScrollTrigger handles scroll-driven animations and complex timelines. Lenis provides smooth momentum scrolling. This is the exact stack used by Awwwards-winning sites in 2025-2026.

### Setup: Lenis + GSAP + Framer Motion in Next.js

```tsx
// app/providers/SmoothScrollProvider.tsx
'use client';
import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function SmoothScrollProvider({ children }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(lenis.raf);
    };
  }, []);

  return children;
}
```

### Animation Tokens (Timing & Easing)

```ts
// Consistent across entire app
export const motion = {
  // Easings
  ease: {
    default: [0.25, 0.1, 0.25, 1],      // cubic-bezier -- smooth, professional
    out:     [0, 0, 0.2, 1],              // decelerate (entering elements)
    in:      [0.4, 0, 1, 1],              // accelerate (exiting elements)
    spring:  { type: 'spring', stiffness: 300, damping: 30 },
    bounce:  { type: 'spring', stiffness: 400, damping: 15 },
  },
  // Durations
  duration: {
    instant:  0.1,   // Button press feedback
    fast:     0.15,  // Hover states, toggles
    normal:   0.25,  // Panel transitions, fades
    smooth:   0.4,   // Page transitions, slide-ins
    slow:     0.6,   // Hero animations, reveals
    dramatic: 1.0,   // Staggered text reveals, 3D scenes
  },
  // Stagger
  stagger: {
    fast:    0.03,   // Character-level text reveals
    normal:  0.05,   // List items, grid cards
    slow:    0.08,   // Section-level staggers
  },
};
```

### Core Animations to Implement

#### 1. Page Transitions (Linear-style)
```tsx
// Crossfade + subtle slide
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -4 }}
  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
>
```

#### 2. Text Reveal on Scroll (GSAP SplitText style)
```tsx
// Split headline into words, animate each with clip-path mask
// Each word: translateY(100%) -> translateY(0), opacity 0 -> 1
// Stagger: 0.05s between words
// Trigger: ScrollTrigger, start: "top 85%"
// Use 'split-type' npm package (free SplitText alternative)
```

#### 3. Card Stagger Entrance
```tsx
// Grid items enter with staggered fade + rise
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-50px" }}
  transition={{
    duration: 0.4,
    delay: index * 0.05,
    ease: [0, 0, 0.2, 1]
  }}
>
```

#### 4. Hover Glow (Vercel-style cursor tracking)
```tsx
// Already described in Cards section
// Key: the glow follows the cursor across the card surface
// Performance: use CSS custom properties, not re-renders
```

#### 5. Magnetic Buttons (Stripe-style)
```tsx
// strength: 0.12 (subtle pull toward cursor)
// release: spring animation back to origin
// displacement cap: 4px max
// Only on desktop (check pointer: fine)
```

#### 6. Number Ticker / Counting Animation
```tsx
// For marketplace stats: Total Robots, Volume, Floor Price
// Use Framer Motion's useMotionValue + useTransform
// Animate from 0 to target over 1.5s with ease-out
// Format with Intl.NumberFormat during animation
```

#### 7. Status Pulse
```css
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 var(--accent-glow); }
  50% { box-shadow: 0 0 8px 4px var(--accent-glow); }
}
/* Duration: 2s infinite, apply to online status dots */
```

#### 8. Parallax Depth Layers
```tsx
// Hero section: 3 layers at different scroll speeds
// Background particles/mesh: 0.3x scroll speed
// Mid content: 0.6x
// Foreground elements: 1x (normal)
// Use GSAP ScrollTrigger scrub for butter-smooth parallax
```

#### 9. Skeleton Loading States
```css
/* Animated gradient shimmer */
.skeleton {
  background: linear-gradient(90deg, #1A1D22 25%, #24282F 50%, #1A1D22 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

#### 10. Scroll-Driven Progress Bar
```tsx
// Thin line at top of page showing scroll progress
// Color: accent gradient
// Height: 2px
// Use Framer Motion useScroll + scaleX transform
```

---

## 7. SPECIFIC REFERENCE SITE TECHNIQUES TO STEAL

### From linear.app
- **LCH color space theming** -- colors that look equally good across hues
- **Cmd+K command palette** as primary navigation (faster than menus)
- **Minimal visual noise** -- reduce borders, use spacing for separation
- **Side panel pattern** -- details slide in from right, never full-page navigations
- **Keyboard-first** -- every action has a shortcut
- **Subtle transitions** -- 200-300ms, ease-out, never bouncy

### From vercel.com
- **Gradient text** with `-webkit-background-clip: text` and animated gradients (8s infinite loop)
- **Mouse-tracking card glow** -- radial gradient follows cursor position
- **Section dividers** -- subtle `1px solid rgba(255,255,255,0.06)` instead of thick borders
- **Code blocks** with syntax highlighting as design elements
- **"Beam" effects** -- thin animated light lines that trace borders or paths
- **Noise texture overlay** -- SVG filter at 3% opacity to add grain to gradients

### From stripe.com
- **Purposeful animation** -- every animation conveys meaning, not just decoration
- **Randomized timing** -- typing animations with random delays feel more human
- **3D card rotations** -- subtle tilt on hover (< 5 degrees), perspective: 1000px
- **Perceived performance** -- optimistic UI updates, instant feedback
- **prefers-reduced-motion** -- always respect accessibility preferences
- **Layered depth** -- overlapping elements with different z-indices create physical presence

### From cosmos.network
- **Space-themed 3D elements** -- planets, orbits, particle fields
- **Colorful gradients on dark** -- multiple gradient layers create depth
- **Spinning globe** visuals for "global network" messaging
- **Schematic diagrams** -- technical illustrations that explain architecture
- **Alternating section backgrounds** -- subtle shifts between base-0 and base-1

### From railway.app
- **Status-dot language** -- green/yellow/red dots for instant status
- **Compact metric cards** -- small cards with single key number + label
- **Real-time indicators** -- blinking cursors, live log streams
- **Developer-grade density** -- information-rich without feeling cluttered
- **Graph sparklines** -- inline mini charts in cards and table rows

---

## 8. 3D & IMMERSIVE ELEMENTS

### Hero Section: Particle Mesh / Robot Wireframe

Use **React Three Fiber** (@react-three/fiber) + **@react-three/drei** for the hero section. Two viable approaches:

**Option A: Floating Particle Field**
- 2000-5000 particles in a soft cloud formation
- Color: accent cyan with varying opacity
- Subtle drift animation (noise-based displacement)
- Responds to mouse movement (parallax shift)
- Performant: instanced mesh, no shadows

**Option B: Robot Wireframe**
- Load a simplified humanoid mesh (low-poly, 2k-5k verts)
- Render as wireframe with accent color
- Slow rotation (0.001 rad/frame)
- Vertex displacement on scroll
- Glow post-processing effect

**Performance guardrails:**
- Always use `<Suspense>` with fallback
- Canvas size: max 60% viewport width
- Target 60fps -- drop particle count on mobile
- Use `frameloop="demand"` to only render on interaction
- Disable on `prefers-reduced-motion`

### Noise/Grain Overlay (Global)

```css
/* Apply to body::after or a fixed overlay */
.noise-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: 0.035;
  background-image: url('/noise.svg');
  /* or use CSS filter: contrast(170%) brightness(1000%) with tiny random pixels */
}
```

This prevents flat gradient banding and adds texture that makes the interface feel physical/analog.

---

## 9. WEB3-SPECIFIC UI PATTERNS

### Wallet Connection Flow (from Uniswap/Aave best practices)
- Show explore mode before connection -- let users browse robots/marketplace first
- Connect button: gradient border, ghost fill, wallet icon
- Connected state: truncated address (0x1234...5678) + network badge + avatar (blockies/jazzicon)
- Always show network status in top bar

### Transaction States
```
Idle       -> Button normal
Pending    -> Spinner inside button, disabled, "Confirming..."
Success    -> Green check, toast notification, auto-dismiss 5s
Failed     -> Red X, error message, "Try Again" action
```

### Token/Price Display
- Always monospace font
- Right-aligned in tables
- Show USD equivalent below/beside crypto amount
- Green/red color for positive/negative changes
- Animate number changes (count-up/down)

### Contract Interaction Cards
- Show gas estimate before confirmation
- Expandable "Advanced" section for power users
- Transaction hash with copy button + block explorer link after success

### Trust Signals (from EigenLayer)
- Audit badges in footer
- TVL / volume metrics with live updates
- Smart contract addresses visible and verifiable
- "Verified" badges on robot listings

---

## 10. RESPONSIVE & PERFORMANCE STRATEGY

### Mobile Adaptations
- Sidebar collapses to bottom tab bar on mobile
- Cards go single-column below 768px
- Disable 3D hero on mobile (show static gradient + image instead)
- Touch targets: minimum 44px
- Disable magnetic buttons and cursor effects on touch devices

### Performance Budget
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Total JavaScript: < 300KB gzipped (excluding three.js)
- Three.js loaded lazily, only on pages that need it
- Images: next/image with blur placeholders
- Fonts: preload display fonts, subset to Latin

### Tailwind Config Skeleton

```ts
// tailwind.config.ts -- key extensions
{
  theme: {
    extend: {
      colors: {
        base: {
          0: '#08090B',
          1: '#111316',
          2: '#1A1D22',
          3: '#24282F',
          4: '#2E333B',
        },
        accent: {
          DEFAULT: '#00E5FF',
          muted: '#00B8D4',
          subtle: 'rgba(0, 229, 255, 0.07)',
          glow: 'rgba(0, 229, 255, 0.25)',
        },
        success: '#34D399',
        danger: '#F87171',
        warning: '#FBBF24',
        text: {
          primary: '#F0F2F5',
          secondary: '#A0A8B4',
          tertiary: '#6B7280',
          disabled: '#4B5563',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '16px',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
      },
    },
  },
}
```

---

## 11. INSPIRATION BOARD SUMMARY

| Reference       | What to Steal                                    | Personality Trait    |
|-----------------|--------------------------------------------------|----------------------|
| Linear          | Cmd+K, side panels, LCH colors, minimal chrome  | Precision, speed     |
| Vercel          | Gradient glow, noise texture, beam effects       | Polish, craft        |
| Stripe          | Purposeful animation, magnetic buttons, depth    | Warmth, intelligence |
| Hyperliquid     | Information density, data tables, short animations| Performance, trust  |
| Cosmos          | 3D space elements, gradient layering, diagrams   | Scale, futurism      |
| Railway         | Status dots, compact metrics, real-time feel     | Developer credibility|
| Figure AI       | Robot imagery as hero, dark + white contrast      | Physical presence    |
| EigenLayer      | Brutalist type scale, high contrast, trust signals| Institutional weight|
| Boston Dynamics | Video-first hero, mechanical precision aesthetic  | Engineering pride    |

---

## 12. IMPLEMENTATION PRIORITY ORDER

1. **Tailwind config + color tokens** -- establish the visual foundation
2. **Typography setup** -- install fonts, define scale, apply antialiasing
3. **App shell** -- sidebar, top bar, layout grid
4. **Card component** with hover glow effect
5. **Button variants** with active press scale
6. **Lenis smooth scroll** provider
7. **Page transition** wrapper (Framer Motion AnimatePresence)
8. **Cmd+K command palette** (use cmdk library)
9. **Data table** component with monospace numbers
10. **3D hero section** (React Three Fiber, lazy loaded)
11. **Scroll-triggered text reveals** (GSAP SplitText)
12. **Magnetic button** effect (desktop only)
13. **Noise overlay** (global)
14. **Wallet connection** flow + transaction states

---

## 13. PACKAGES TO INSTALL

```bash
# Animation & Interaction
npm install framer-motion gsap @gsap/react lenis split-type

# 3D (lazy load)
npm install @react-three/fiber @react-three/drei three

# UI Primitives
npm install cmdk @radix-ui/react-dialog @radix-ui/react-tooltip @radix-ui/react-dropdown-menu

# Web3
npm install wagmi viem @rainbow-me/rainbowkit

# Fonts
npm install @fontsource/inter @fontsource/space-grotesk @fontsource/jetbrains-mono
```

---

## SOURCES & REFERENCES

### Robotics Sites
- [Figure AI](https://www.figure.ai/)
- [Boston Dynamics](https://bostondynamics.com/)
- [Sanctuary AI](https://www.sanctuary.ai/)

### Web3/DeFi Design
- [Best Web3 Websites of 2026 | Merge](https://merge.rocks/blog/what-we-can-learn-from-the-best-web3-websites-of-2026)
- [Web3 UX Design Trends 2026 | BricxLabs](https://bricxlabs.com/blogs/web-3-ux-design-trends)
- [CSS Tricks for Dark Futuristic Web3 Look](https://trishalim.com/blog/css-tricks-to-create-that-dark-futuristic-web3-look)
- [EigenLayer Design System | Forge Studio](https://www.forge.is/working-on/eigenlayer)
- [Hyperliquid Frontend Wars | Blockworks](https://blockworks.co/news/hyperliquid-the-frontend-wars)

### Design Systems & UI Trends
- [Linear UI Redesign](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Linear Style Design: Origins & Techniques](https://medium.com/design-bootcamp/the-rise-of-linear-style-design-origins-trends-and-techniques-4fd96aab7646)
- [Linear Design Trend | LogRocket](https://blog.logrocket.com/ux-design/linear-design/)
- [Vercel Gradient Text Effect](https://kevinhufnagl.com/verceltext-gradient/)
- [Stripe: Behind the Front-End Experience](https://stripe.com/blog/connect-front-end-experience)
- [The Stripe Effect | Newbird](https://newbird.com/the-stripe-effect/)
- [UI Design Trends 2026 | Landdding](https://landdding.com/blog/ui-design-trends-2026)
- [Dark Mode Color Palettes | Colorhero](https://colorhero.io/blog/dark-mode-color-palettes-2025)
- [UI Color Trends 2026 | Updivision](https://updivision.com/blog/post/ui-color-trends-to-watch-in-2026)

### Animation & Interaction
- [CSS/JS Animation Trends 2026 | Web Peak](https://webpeak.org/blog/css-js-animation-trends/)
- [2026 Web Design Trends: Micro-Animations | Digital Upward](https://www.digitalupward.com/blog/2026-web-design-trends-glassmorphism-micro-animations-ai-magic/)
- [GSAP SplitText Docs](https://gsap.com/docs/v3/Plugins/SplitText/)
- [Scroll Animation Libraries 2026](https://cssauthor.com/best-javascript-scroll-animation-scrollytelling-libraries/)
- [Magnetic Button Tutorial](https://blog.olivierlarose.com/tutorials/magnetic-button)
- [Lenis Smooth Scroll + GSAP in Next.js](https://devdreaming.com/blogs/nextjs-smooth-scrolling-with-lenis-gsap)
- [Lenis GitHub](https://github.com/darkroomengineering/lenis)
- [Sticky Cursor Effect with Framer Motion](https://blog.olivierlarose.com/tutorials/sticky-cursor)

### 3D & WebGL
- [React Three Fiber Docs](https://r3f.docs.pmnd.rs/getting-started/introduction)
- [Particles with React Three Fiber & Shaders](https://blog.maximeheckel.com/posts/the-magical-world-of-particles-with-react-three-fiber-and-shaders/)
- [Subtle Shader Background with R3F | Codrops](https://tympanus.net/codrops/2024/10/31/how-to-code-a-subtle-shader-background-effect-with-react-three-fiber/)
- [Scroll-Revealed WebGL Gallery | Codrops](https://tympanus.net/codrops/2026/02/02/building-a-scroll-revealed-webgl-gallery-with-gsap-three-js-astro-and-barba-js/)

### Award Sites
- [Awwwards Technology Websites](https://www.awwwards.com/websites/technology/)
- [Awwwards Annual Awards 2025](https://www.awwwards.com/annual-awards/)
- [Dark Design Web3 Category](https://www.dark.design/category/web3)
