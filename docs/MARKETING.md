# MARKETING

> The public-facing surfaces. Landing, about, apply. Copy, structure, conversion goals.

The marketing site is what visitors see before they trust Rova with money. Every word + pixel is in service of "this is real infrastructure, not a crypto vibe."

---

## The three pages

### `/` — Landing

Single long page. 14 sections (the espresso-systems pattern). Goal: convert serious operators / agent builders / partners into either `/onboard` or `/apply` clicks.

### `/about`

Short page. Why Rova exists, who built it, the operator + agent + robot frame. Goal: trust signal for visitors weighing whether to dig deeper.

### `/apply`

Pilot intake form. Operator pilot, agent integration, robot partner. Goal: surface high-intent leads + filter low-effort ones.

---

## Landing — section by section

### 1. Hero (paper)

```
THE SETTLEMENT LAYER. FOR ROBOTS THAT EARN.

ACP-native marketplace where autonomous agents hire physical robots —
escrow on Base, proof onchain, settlement in seconds.

[ See the protocol live → /simulator ]   [ Apply for the pilot → /apply ]

(WarehouseSchematic SVG illustration)
```

Anchored on a hero illustration (the `WarehouseSchematic` icon from `Icons.tsx`). One sentence subheading. Two CTAs. No video, no parallax.

### 2. Value prop strip (cream-soft)

Three numbers in mono, no chartjunk:

```
0.3%              Sub-1-minute       ~50ms gas
protocol fee      settlement         per proof
on settled work   target             on-chain verify
```

### 3. Four pillars (paper)

`Schema · Settlement · Proof · Stake` — four cards explaining what makes Rova a marketplace, not a job board.

```
SCHEMA
ACP v2 task objects. Every Rova job is an ACP-native object — agents
already speak this. Onboarding an agent is one wallet, no protocol-
specific learning.

SETTLEMENT
USDC on Base. Robots get paid into their ERC-4337 wallet the moment
proof verifies. No invoicing, no off-chain bookkeeping. The chain is
the ledger.

PROOF
GPS + timestamp + sensor hash. Cheap to verify on-chain, hard to forge
cheaply, debuggable when rejected. The substrate moat.

STAKE
100 ROVA per robot, slashable on failed proofs. Robots can't spam
offerings without skin in the game. Agents can trust the marketplace
because everyone listed has staked.
```

### 4. Three-actor diagram (cream)

`Agent ↔ Marketplace ↔ Operator + Robot`

Schematic line diagram showing money flow + event flow. SVG. From `ProtocolFlowSchematic` in `Icons.tsx`.

### 5. Lifecycle (paper)

Compressed version of `STATE-MACHINE.md` lifecycle:

```
1.  Agent posts job          $9 in escrow
2.  Robot accepts             $4.80 bid locked
3.  Robot navigates           ~5 min
4.  Proof submitted           GPS + timestamp + sensor hash
5.  Proof verifies            two integer comparisons
6.  Settlement                $4.79 → robot · $0.01 fee · $4.20 refund

End-to-end: ~10 min · 4 transactions · ~$0.04 in gas
```

### 6. Live data sheet (cream)

Contracts deployed on Base Sepolia. Addresses, deployment block, ABI links.

```
ROVARegistry    0x...   Base Sepolia
ROVAMarket      0x...   Base Sepolia
ROVAVerifier    0x...   Base Sepolia
ROVAWallet      0x...   Base Sepolia
```

Plus current testnet stats:
- Total jobs settled
- Avg completion time
- Avg fee per task type
- Active robots
- Active offerings

Refreshes from indexer every 60s. Dataself-evidently real, not a hand-curated marketing chart.

### 7. Try it (paper)

Embedded mini-simulator OR a link to the full `/simulator`. Embedded is preferred — the visitor sees something running, not just a screenshot.

### 8. For operators (cream)

```
YOU HAVE ROBOTS. THEY SIT IDLE 12 HOURS A DAY.

Plug them into Rova. Set your policy. Watch them earn during off-hours.
You stay in control: pause, geofence, price floor, blacklist.

→ Operator onboarding (45 min)
```

Concrete operator story (Adaeze from `USE-CASES.md`) condensed.

### 9. For agent builders (paper)

```
YOUR AGENT NEEDS PHYSICAL WORK DONE.

Use the @rova/agent-sdk. Post jobs in your existing Virtuals runtime,
get proof and settlement onchain.

→ Agent SDK quickstart
```

Code sample (the minimal one from `SDK-AGENT.md`).

### 10. Partner logos (cream-soft)

Where applicable: Virtuals, Unitree, Reachy, Hugging Face (HF-Pollen), Base. Light treatment — small grayscale logos, no testimonials.

### 11. Built for next (paper)

Quote-style:
> "Robots that earn need a settlement layer they can trust. Rova is that layer."

### 12. Integration cards (cream)

Three cards, each pointing to a deeper doc:

```
ROBOTS                AGENTS                 INDEXER
ROS2 + Python SDK     Node.js + TypeScript   Self-hostable
30-min integration    10-min integration     Open source

→ SDK-ROBOT.md       → SDK-AGENT.md         → INDEXER.md
```

### 13. Process timeline (paper)

5-step bullet for an interested operator:

```
1.  Apply for pilot              we review weekly
2.  Discovery call                15 min, no commitment
3.  SDK install + first robot     ~45 min
4.  First 50 jobs                 we co-watch, you tune policy
5.  Auto-accept on, you walk      typically week 2
```

### 14. Footer (bean / dark band)

Logo, links, address, social. The only dark section on the page — a visual full-stop after a lot of light.

```
Rova Protocol
ACP-native task marketplace for physical robots.

Product           Docs            Protocol
  Operator          Quickstart      Contracts
  Agent             SDK             ROADMAP
  Simulator         Spec            Whitepaper

Built on Base · 0.3% protocol fee · MIT licensed SDKs

© 2026  ·  Terms  ·  Privacy
```

---

## About — structure

Short page. ~3 screen-heights.

### Why Rova exists
The frame: robots earn idle hours through coordination, not contracts. Coordination requires a substrate. Rova is that substrate.

### The three actors
A condensed `USE-CASES.md` — one paragraph each on Operator / Agent / Robot.

### Who built this
Team page (when there's a team to name). For now: a paragraph + GitHub link.

### Why now
Three factors:
1. Affordable humanoids shipping (Unitree G1, Reachy)
2. ACP standardizing agent communication
3. Base reducing on-chain friction to ~$0.01 per tx

The window is open. Rova is the marketplace these three open into.

### Where it's going
Link to `ROADMAP.md`. One paragraph summary.

---

## Apply — form

Single page. Three pilot tracks the visitor selects:

```
WHO ARE YOU?
( ) Fleet operator — I have robots                   → 4 fields
( ) Agent builder — I have an agent                  → 3 fields
( ) Robot partner — I sell robot hardware/SDKs       → 3 fields
```

### Operator fields

```
Company / fleet name      [             ]
Fleet size                [ 1-5 / 6-20 / 20+ ]
Primary robot model       [ Unitree G1 / Spot / Reachy / Other ]
Off-hours capacity        [ small / mid / large ]
Primary use case          [ free text, optional ]
Timeline                  [ this month / quarter / exploring ]
Contact                   [ email + telegram optional ]

[ Apply for pilot ]
```

### Agent builder fields

```
Agent name / project       [             ]
Hosted on                  [ Virtuals / custom / other ]
Target task types          [ ☑ CARRY ☑ NAVIGATE ☑ INSPECT ☑ SORT ]
Volume estimate            [ jobs/day ]
Contact                    [ email + Discord/Telegram ]

[ Apply for pilot ]
```

### Robot partner fields

```
Company name               [             ]
Robot models                [             ]
Number of deployed units    [             ]
Interest                    [ ☑ integrate ROS2 SDK ☑ co-marketing ☑ joint pilot ]
Contact                     [ email + name ]

[ Apply for partnership ]
```

### After submit

Modal: "Got it. We review applications weekly. You'll hear back within 7 days."

Plus a calendar link for a 15-min intro call (Calendly or similar). Some applicants book the call directly — these are the highest-intent leads.

---

## Telemetry

```
marketing.landing.viewed                    (referrer)
marketing.landing.scroll_depth              (max % scrolled)
marketing.section.cta_clicked               (section, cta)
marketing.simulator.embedded_started
marketing.about.viewed
marketing.apply.viewed
marketing.apply.track_selected              (track)
marketing.apply.submitted                   (track, fields_count)
marketing.apply.calendar_booked
```

Funnel: landing → simulator → apply → submit. Each step's drop-off tells us where to focus.

---

## SEO

- One H1 per page (the hero headline)
- `og:image` per page (the WarehouseSchematic for /, ProtocolFlowSchematic for about)
- Sitemap, robots.txt
- Sub-150 word meta descriptions
- Schema.org Product markup for /
- No keyword stuffing. The brand is its own keyword.

---

## What this page does NOT do

- Newsletter signup
- Modal popups
- Cookie banner with options (just an honest "we use cookies for analytics" footer note)
- "As seen in" press logos (don't have them yet; don't fake them)
- Hype copy ("revolutionary", "first ever", "the future of")
- Crypto vibes (no green-on-black terminal aesthetic; no rocket emoji; no shilling)

Restraint is the brand.

---

## Related

- `DESIGN-SYSTEM.md` — typography, color, motion choices for marketing
- `IA.md` § Marketing — URL inventory + nav rules
- `SIMULATOR.md` — the embedded preview on landing
- `COPY/LANDING.md` — every word on the landing page
- `COPY/MICROCOPY.md` — every button label and form helper
- `BIZ/PRICING.md` — the 0.3% mentioned on landing
