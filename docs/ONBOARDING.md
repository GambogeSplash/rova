# ONBOARDING

> The Operator's first 45 minutes. From "I have robots that sit idle" to "I'm earning USDC on Base, autonomously, while my primary client uses my fleet during business hours."

This is the most important flow Rova ships. It's the only flow that converts revenue.

---

## Audience

A fleet operator with 1–20 physical robots. They have:
- Robots that can run autonomously (Unitree G1, ROS2-based custom builds, similar)
- A primary client / use case the robots already serve (their dayside revenue)
- An ETH wallet (MetaMask, Safe, Rainbow)
- Off-hours capacity they want to monetize

They do not have:
- Deep crypto experience necessarily
- Patience for setup that takes > 1 hour
- Tolerance for surprises in production

---

## Entry points

- Marketing landing page `/` → "I'm an operator" CTA → `/onboard`
- Direct link `/onboard` shared by Rova BD
- Sim graduation: `/simulator` → "Try this with real robots" CTA → `/onboard`

All paths land on the **two-door** entry.

---

## The two-door entry

`/onboard` shows two cards:

```
┌────────────────────────────┐    ┌────────────────────────────┐
│  I'M AN OPERATOR           │    │  I'M AN AGENT BUILDER      │
│                            │    │                            │
│  I have robots. I want     │    │  I'm building a Virtuals   │
│  them to earn off-hours    │    │  agent that needs to hire  │
│  and weekends.             │    │  physical robots.          │
│                            │    │                            │
│  → 4 steps · ~45 min       │    │  → 3 steps · ~20 min       │
└────────────────────────────┘    └────────────────────────────┘
```

This document specifies the Operator flow (the left card). The Agent flow lives in `AGENT-POST.md` § Onboarding.

---

## The four steps

```
1.  Connect wallet                       ~3 min
2.  Register your first robot            ~12 min
3.  Author your policy                   ~20 min
4.  Publish offerings                    ~10 min
─────────────────────────────────────────────────
                                  Total: ~45 min
```

Each step has its own URL (`/onboard/operator/1` … `/4`) and a back-arrow to the previous step. Forward progress only on "Continue."

---

## Step 1 — Connect wallet

### What happens

The operator clicks "Connect wallet." Standard wallet picker. They sign a SIWE message.

### Visual

A two-column layout. Left: a 3-line "what's about to happen" block. Right: the wallet button.

```
┌─────────────────────────────────┬──────────────────────────────┐
│                                 │                              │
│  STEP 1 OF 4                    │                              │
│                                 │                              │
│  Connect your operator wallet   │   [ Connect wallet ]         │
│                                 │                              │
│  This wallet owns the fleet     │   Supported: MetaMask, Safe, │
│  and signs registration calls.  │   Rainbow, WalletConnect     │
│  You can use Safe for a multi-  │                              │
│  sig setup (recommended for     │                              │
│  fleets > 5 robots).            │                              │
│                                 │                              │
└─────────────────────────────────┴──────────────────────────────┘
```

### Edge cases

- **Wrong network.** "Switch to Base Sepolia" CTA. Programmatic switch on supporting wallets.
- **Sign rejected.** Returns to the same screen with a polite retry message.
- **Wallet already used.** If this wallet has an existing operator profile, the flow short-circuits to `/dashboard` ("Welcome back").
- **Wallet on mainnet.** Same screen with stronger warning ("This is testnet. Don't use real funds yet.").

### Exit state

SIWE session cookie set. Role cookie set to `operator`. Routes to `/onboard/operator/2`.

---

## Step 2 — Register your first robot

### Frame

The operator registers one robot now. They can add more later from the dashboard. We deliberately don't ask them to do a bulk import here — first-success-fast is the priority.

### Visual

A form panel with three fields and an info column on the right.

```
┌─────────────────────────────────┬──────────────────────────────────┐
│  STEP 2 OF 4                    │  This creates:                   │
│                                 │                                  │
│  Name your first robot          │  • An ERC-4337 smart wallet that │
│                                 │    will receive USDC payments    │
│  Robot name *                   │  • A robot entry in the on-chain │
│  ┌────────────────────────────┐ │    ROVA registry                 │
│  │  G1-ALPHA                  │ │  • A session key the SDK will    │
│  └────────────────────────────┘ │    use to sign for this robot    │
│                                 │                                  │
│  Model *                        │  Stake on first registration:    │
│  ┌────────────────────────────┐ │  100 ROVA (~$180 at today's      │
│  │  Unitree G1                ▾ │ │  price)                          │
│  └────────────────────────────┘ │                                  │
│  Other models: Boston Dynamics  │  This stake will be slashed if   │
│  Spot, Reachy, Custom ROS2      │  your robot fails delivery —     │
│                                 │  protects clients from spam      │
│  Initial stake *                │  registrations.                  │
│  ┌────────────────────────────┐ │                                  │
│  │  100 ROVA          ($179)  │ │  You can add more stake later.   │
│  └────────────────────────────┘ │                                  │
│                                 │                                  │
│  Where is this robot?           │                                  │
│  ┌────────────────────────────┐ │                                  │
│  │  📍 Locate on map…         │ │  Locking GPS gives us a          │
│  └────────────────────────────┘ │  starting bound for your         │
│                                 │  geofence (you can adjust later) │
│                                 │                                  │
│                       [Register]│                                  │
└─────────────────────────────────┴──────────────────────────────────┘
```

### Mechanics

When operator clicks Register:

1. Show a confirmation modal: "We'll create a smart wallet, write the robot to the registry, and stake 100 ROVA. Two transactions, ~$0.06 in gas."
2. Operator confirms.
3. UI dispatches:
   - `ROVAWallet.create()` (deploy smart wallet) — UserOp via paymaster, sponsor pays gas
   - `rovaToken.approve(registry, 100e18)` — operator signs
   - `ROVARegistry.registerRobot(name, model, walletAddress, 100e18)` — operator signs
4. Wait for `RobotRegistered` event. Show progress indicator with each step.
5. On success: show the new `robotId` + smart-wallet address, with a "copy to clipboard" affordance.

### Edge cases

- **Stake amount < `minStake`.** Disabled Register button, inline error.
- **ROVA approval fails.** Toast: "ROVA approval failed. Try again." Don't auto-retry — the operator may have intentionally cancelled.
- **Registry call reverts.** Show the revert reason as a structured error (`InsufficientStake`, etc., per `ERRORS.md` § C).
- **Map widget fails to load.** Fall back to manual lat/lng input.

### Exit state

New `robotId` minted. Operator's `ownerRobots` list now has one entry. Routes to `/onboard/operator/3`.

---

## Step 3 — Author your policy

### Frame

The policy is the constraint set the robot will use to accept or reject offers. We start the operator from a template (3 options) and let them tune the highest-leverage knobs.

### Visual

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3 OF 4                                                    │
│                                                                 │
│  Pick a policy template                                         │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │ Cautious         │  │ 24/7 Fulfillment │  │ Outdoor        │ │
│  │ Warehouse        │  │                  │  │ Last-Mile      │ │
│  │                  │  │                  │  │                │ │
│  │ Manual approval. │  │ Auto-accept.     │  │ Wider area.    │ │
│  │ Geofence to      │  │ Round-the-clock. │  │ Daylight only. │ │
│  │ building. 4.0+   │  │ 3.0+ reputation. │  │ 4.5+ rep.      │ │
│  │ reputation.      │  │ Indoor + RTK.    │  │ Outdoor + rain.│ │
│  │                  │  │                  │  │                │ │
│  │  RECOMMENDED ▼   │  │      Use →       │  │     Use →      │ │
│  └──────────────────┘  └──────────────────┘  └────────────────┘ │
│                                                                 │
│  ─── Tune the policy ───────────────────────────────────────── │
│                                                                 │
│  Accept task types                                              │
│  [✓] CARRY     [✓] SORT     [ ] NAVIGATE     [ ] INSPECT       │
│                                                                 │
│  Price floor (CARRY)                                            │
│  $4.50 ────●──────────────  $50                                 │
│                                                                 │
│  Price floor (SORT)                                             │
│  $3.00 ──●────────────────  $30                                 │
│                                                                 │
│  Time windows                                                   │
│  [✓] Mon-Fri 18:00 → 06:00       [Edit]                         │
│  [✓] Sat-Sun all day             [Edit]                         │
│  [+ Add window]                                                 │
│                                                                 │
│  Geofence                                                       │
│  Drawn around your warehouse coordinates ─ [Adjust on map]      │
│                                                                 │
│  Auto-accept offers                                             │
│  ( ) On    (●) Off (review manually for first 1-2 weeks)       │
│                                                                 │
│                                              [Save & continue] │
└─────────────────────────────────────────────────────────────────┘
```

The full editor (with all 10 primitives) lives in `/dashboard/policies` (see `POLICY-EDITOR.md` flow + component spec). Here we surface only the load-bearing 6:

1. Accept task types
2. Price floors (per task type)
3. Time windows
4. Geofence
5. Auto-accept
6. *(implicit defaults for reputation threshold, blacklist, max concurrent jobs, daily withdraw cap, required capabilities)*

The first save writes the policy to local storage AND to the operator's Postgres (if they enable cloud sync). Subsequent edits diff against the saved version.

### Edge cases

- **No task types selected.** Disabled save button.
- **Price floor = 0.** Inline warning: "Setting a $0 floor accepts any offer — recommended floor is $4.50 for CARRY based on the current market."
- **Geofence inverted (min > max).** Inline red highlight + "Bounds inverted; would reject all offers."

### Exit state

Policy persisted. Routes to `/onboard/operator/4`.

---

## Step 4 — Publish offerings

### Frame

The robot is registered, the policy is set, but no agent can find this robot until *offerings* are published. Each offering is a (taskType, price, SLA) tuple that gets written on-chain.

### Visual

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4 OF 4                                                    │
│                                                                 │
│  Publish your first offerings                                   │
│                                                                 │
│  Your policy says you'll accept CARRY at $4.50+ and SORT at     │
│  $3.00+, with 30-minute SLAs. We'll publish offerings at        │
│  your floor price — agents will offer above this.               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  CARRY · $4.50 USDC · 30 min SLA                       │    │
│  │  G1-ALPHA · #1                                          │    │
│  │                                                         │    │
│  │  [✓] Publish this offering                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  SORT · $3.00 USDC · 30 min SLA                        │    │
│  │  G1-ALPHA · #1                                          │    │
│  │                                                         │    │
│  │  [✓] Publish this offering                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Once published, agents browsing the registry will see these.   │
│  They'll bid against your floor price.                          │
│                                                                 │
│  Estimated gas: ~$0.04                                          │
│                                                                 │
│                                          [Publish offerings →] │
└─────────────────────────────────────────────────────────────────┘
```

### Mechanics

Operator clicks Publish.

1. For each checked offering, dispatch `ROVARegistry.publishOffering(robotId, taskType, priceUsdc, slaMinutes)`. Two transactions if both task types.
2. Wait for `OfferingPublished` events.
3. Once both fire, redirect to `/dashboard` with a celebration toast: "🎉 Your robot is now live. Watch for offers in the top bar."

### Edge cases

- **Operator wants to publish more SLA tiers.** Out of scope here — they can add more from the dashboard.
- **Gas spike.** Show the gas estimate; if > $1, banner: "Network is congested. You can wait or publish anyway." Don't block.

### Exit state

Robot offerings live on-chain. Routes to `/dashboard`. The dashboard's offer-stream is now active for this robot.

---

## What "done" feels like

The operator finishes onboarding with:

- One robot registered on-chain
- One smart wallet ready to receive USDC
- One staked 100 ROVA position
- One policy authored
- Two offerings published (CARRY + SORT)
- A dashboard with a live offer-stream (empty for now, will populate as agents discover them)

**Total ETH spent on gas:** ~$0.10 (paymaster sponsored the wallet creation; operator paid for the 4 user-signed txns)
**Total real cost:** the 100 ROVA stake (refundable on deactivation; slashable on failed jobs)

Their next 60 minutes is watching the dashboard, approving the first few offers manually, and confirming each one settles correctly. After 4–5 successful jobs, they typically flip `autoAccept` to `true` and walk away.

---

## What goes wrong (and how the flow recovers)

### "I closed the tab between steps"

Each step persists state on advance. Closing the tab and reopening `/onboard/operator/3` (with the wallet still connected) resumes where they left off. Local storage holds the in-progress robot info until step 4 confirms.

### "I signed Step 2 then disappeared"

The robot is registered on-chain. They can come back later — `/onboard/operator/3` detects the existing robot and pre-fills.

### "I want to add a second robot during onboarding"

Out of scope. Onboarding gets one robot live. Multi-robot is the dashboard's job ("Add another robot" button on the Fleet view). We deliberately don't let the operator try to bulk-add during step 2 — first-success-fast.

### "I want to skip the policy and just see what offers come in"

Not allowed. A robot with no policy = a robot accepting anything = a robot that will lose money on the first offer. We protect new operators from themselves.

### "I want to test without staking"

Out of scope for v1. The stake is the protocol's anti-spam mechanism. v1.5 may add a "trial robot" with a 10-ROVA stake and a cap on total earnings, but not v1.

---

## Telemetry

Each step emits an analytics event:

```
onboarding.step1.viewed
onboarding.step1.wallet_connected     (with chain, wallet_kind)
onboarding.step2.viewed
onboarding.step2.registered           (with model, stake_amount, robotId)
onboarding.step3.viewed
onboarding.step3.template_chosen      (template_name)
onboarding.step3.saved                (policy_diff_from_template)
onboarding.step4.viewed
onboarding.step4.published            (offerings_count)
onboarding.completed                  (total_elapsed_ms)
```

Funnel analysis sits on these. Drop-offs tell us which step needs work.

---

## v1.5+ extensions

- **Bulk robot import** for fleets with 5+ robots — CSV upload after step 2
- **Policy template diffing** — show what's different from the template they picked
- **Pre-funded test agent** — Rova-run agent that posts a few test jobs to a new operator, free, so they see the loop close before they leave onboarding
- **Multi-step undo** — go back any number of steps, edits persist
- **Onboarding chat** — inline help-bot grounded on Rova docs

---

## Related

- `IA.md` — URL structure of /onboard
- `POLICIES.md` — the templates and primitives the policy editor exposes
- `POLICY-EDITOR.md` — the full editor surface used post-onboarding
- `DASHBOARD.md` — where they land after step 4
- `ROBOT-REGISTER.md` — the formal multi-robot register flow used from the dashboard
- `AUTH.md` — wallet + session key setup
- `STATE-MACHINE.md` — what the offer-stream is showing them
