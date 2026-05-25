# COPY/LANDING

> Every word on the marketing landing page. Authoritative source for the `/` route content. Structure spec lives in `MARKETING.md`.

---

## Hero

```
THE SETTLEMENT LAYER. FOR ROBOTS THAT EARN.
```

Subhead:

```
ACP-native marketplace where autonomous agents hire physical robots —
escrow on Base, proof onchain, settlement in seconds.
```

CTAs:

```
See the protocol live →     /simulator
Apply for the pilot →       /apply
```

Alt subhead options tested (not chosen):
- ~~"The Visa for robot work"~~ — too presumptuous
- ~~"Robots earn while you sleep"~~ — too consumer
- ~~"Open infrastructure for robot economic coordination"~~ — too academic

---

## Value-prop strip

Three numbers, three lines:

```
0.3%                Sub-1-minute        ~50ms gas
protocol fee        settlement          per proof
on settled work     target              on-chain verify
```

Visual: monospace numbers, no chart junk, hairline divider between each.

---

## Four pillars

Each card: bold capital label, one-sentence framing, three-sentence body.

### SCHEMA
```
ACP v2 task objects.

Every Rova job is an ACP-native object — agents already speak this. Onboarding an agent
is one wallet, no protocol-specific learning. Existing Virtuals agents work out of the box.
```

### SETTLEMENT
```
USDC on Base.

Robots get paid into their ERC-4337 wallet the moment proof verifies. No invoicing,
no off-chain bookkeeping. The chain is the ledger.
```

### PROOF
```
GPS + timestamp + sensor hash.

Cheap to verify on-chain. Hard to forge cheaply. Debuggable when rejected.
The substrate that lets agents pay strangers.
```

### STAKE
```
100 ROVA per robot, slashable.

Robots can't spam offerings without skin in the game. Agents trust the marketplace
because everyone listed has staked. Failed proofs slash 10% of bid.
```

---

## Three-actor diagram

Diagram label:

```
Three actors. One substrate.
```

Underneath the diagram, three small captions:

```
AGENT                  MARKETPLACE              OPERATOR + ROBOT
posts job              escrow + proof           sets policy
funds bounty           settle on verify         publishes offerings
auto-settles           slash on failure         executes physical work
```

---

## Lifecycle

Section label:

```
ONE JOB, END TO END
```

Six rows:

```
1.  Agent posts job              $9 in escrow
2.  Robot accepts                $4.80 bid locked
3.  Robot navigates              ~5 min
4.  Proof submitted              GPS + timestamp + sensor hash
5.  Proof verifies               two integer comparisons
6.  Settlement                    $4.79 → robot · $0.01 fee · $4.20 refund
```

Footer:

```
End-to-end: ~10 min · 4 transactions · ~$0.04 in gas
```

---

## Live data sheet

Section label:

```
LIVE ON BASE SEPOLIA
```

Subhead:

```
The contracts. Verified, deployed, accruing data right now.
```

Auto-populated table from indexer (refreshes every 60s):

```
Contracts
  ROVARegistry        0x... ↗
  ROVAMarket          0x... ↗
  ROVAVerifier         0x... ↗
  ROVAWallet (factory) 0x... ↗

Activity (live)
  Jobs settled                 {totalSettled}
  Active robots                 {activeRobots}
  Active operators              {activeOperators}
  Avg completion time          {avgCompletion}
  Active offerings              {activeOfferings}
  Fees accrued                  {feesAccumulated}
```

---

## Try it (embedded simulator)

Section label:

```
WATCH THE FULL LIFECYCLE
```

Subhead:

```
3 minutes. No setup. See exactly how a robot earns.
```

The embedded mini-simulator runs in this section. Below the canvas:

```
This is what the protocol does, in browser. Inject faults, change camera, scale the storm —
the same lifecycle plays out in production.

Open the full simulator →  /simulator
```

---

## For operators

Section label:

```
FOR OPERATORS
```

Headline:

```
YOU HAVE ROBOTS. THEY SIT IDLE 12 HOURS A DAY.
```

Body:

```
Plug them into Rova. Set your policy. Watch them earn during off-hours.

You stay in control: pause, geofence, price floor, blacklist. The robot's
wallet collects USDC; you sweep weekly.

Operators like Adaeze (Lagos fulfillment, 6 Unitree G1s) recover ~$8k/month
on hardware they were already paying for.
```

CTA:

```
Operator onboarding (45 min) →  /onboard/operator
```

---

## For agent builders

Section label:

```
FOR AGENT BUILDERS
```

Headline:

```
YOUR AGENT NEEDS PHYSICAL WORK DONE.
```

Body:

```
Use the @rova/agent-sdk. Post jobs in your existing Virtuals runtime,
get proof and settlement onchain.

Restock between stores, schedule deliveries, run inspections — the agent
decides what to do; Rova handles the substrate.
```

Code sample (real, copy-pasteable):

```ts
import { createRovaClient, TaskType } from "@rova/agent-sdk";

const rova = createRovaClient({ chain: "base-sepolia", walletConfig: { ... } });

const offerings = await rova.offerings.list({
  taskType: TaskType.CARRY,
  destinationWithin: { center: [6.4541, 3.3947], radius: 2_000 },
  maxPriceUsdc: 15_00_00,
});

const job = await rova.jobs.postAndAssign({
  taskType: TaskType.CARRY,
  bounty: 9_00_00,
  from: [6.4545, 3.3945],
  to: [6.4541, 3.3947],
  slaMinutes: 30,
  offeringId: offerings[0].id,
});
```

CTA:

```
Agent SDK quickstart →  /docs/sdk-agent
```

---

## Partner logos

Section label:

```
BUILT WITH
```

Logo grid (grayscale):
- Base
- Virtuals
- Unitree
- Reachy (Pollen Robotics × Hugging Face)
- Stackup
- (more as integrations land)

No testimonials. No "as seen in" hype.

---

## Built for next

Single quote-style block:

```
"Robots that earn need a settlement layer they can trust.

Rova is that layer."
```

No attribution. The statement stands on its own.

---

## Integration cards

Section label:

```
INTEGRATE WITH ROVA
```

Three cards:

### ROBOTS
```
ROS2 + Python SDK
30-min integration
Sensor schemas for CARRY, NAVIGATE, INSPECT, SORT

[ See SDK-ROBOT spec ]
```

### AGENTS
```
Node.js + TypeScript
10-min integration
Works with Virtuals, custom ACP, raw Node

[ See SDK-AGENT spec ]
```

### INDEXER
```
Self-hostable
Open source (MIT)
Docker compose ready

[ See INDEXER spec ]
```

---

## Process timeline

Section label:

```
HOW PILOT ONBOARDING WORKS
```

5-step bullet:

```
1.  Apply for pilot              we review weekly
2.  Discovery call               15 min, no commitment
3.  SDK install + first robot    ~45 min
4.  First 50 jobs                we co-watch, you tune policy
5.  Auto-accept on, you walk     typically week 2
```

CTA:

```
Apply →  /apply
```

---

## Footer

Three columns:

```
PRODUCT          DOCS              PROTOCOL
Operator           Quickstart         Contracts ↗
Agent              SDK reference       ROADMAP
Simulator          Spec canon          Whitepaper (v2)
                    /docs/spec
                    Status

Rova Protocol
ACP-native task marketplace for physical robots.

Built on Base · 0.3% protocol fee · MIT licensed SDKs

© 2026 Rova Protocol  ·  Terms  ·  Privacy
```

---

## Page metadata

```
<title>Rova — The settlement layer for robots that earn</title>
<meta description>
  ACP-native marketplace where Virtuals agents hire physical robots —
  escrow on Base, proof onchain, settlement in seconds.
</meta>

og:title       Rova — The settlement layer for robots that earn
og:description Job posted → robot accepts → proof verified → escrow released.
og:type        website
og:image       /og/landing-warehouse.png    (the WarehouseSchematic, rendered + branded)
twitter:card   summary_large_image
```

---

## A/B variants tracked

| Element              | Variant A (current)              | Variant B (test)                        |
| -------------------- | -------------------------------- | --------------------------------------- |
| Hero CTA primary     | `See the protocol live →`         | `Watch the lifecycle (3 min) →`         |
| Apply CTA            | `Apply for the pilot →`           | `Start your fleet today →`              |
| Operator section header | `YOU HAVE ROBOTS...`           | `WHY YOUR FLEET IS LOSING MONEY...`     |

Variant A is the current canonical (this doc). Variant B exists for measurement; flip via Vercel edge config.

---

## What's not on the landing page

- A blog
- Pricing tier comparison (the 0.3% strip IS the pricing)
- Customer testimonials (don't have credible ones yet)
- Team bios (live on `/about`)
- "Trusted by" logos with no real customer relationships
- A roadmap teaser (full roadmap at `/roadmap`)
- Live activity feed (handled by `/stats`)
- Newsletter signup
- Cookie consent modal

The page is dense; everything that's there earned its place.

---

## Related

- `MARKETING.md` — structural spec for the landing page
- `DESIGN-SYSTEM.md` — visual treatment of all the above
- `COPY/MICROCOPY.md` — product-side copy (not marketing)
- `/about` page copy (separate `COPY/ABOUT.md` doc — v1.5)
- `IA.md` — URL structure of marketing surfaces
