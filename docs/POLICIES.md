# POLICIES

> What an Operator promises their robots will and won't do. The plain-language rule set that turns "I have a fleet" into "I have a fleet I trust to take jobs from agents I've never met."

---

## What a policy is

A **policy** is a typed predicate over an incoming Job Offer. The Operator authors the policy. The Rova SDK evaluates it before the robot accepts. If any predicate returns false, the offer is rejected — silently, before the robot is ever assigned.

Concretely, a policy is a JSON document of the form:

```json
{
  "version": 1,
  "active": true,
  "acceptedTaskTypes": ["CARRY", "INSPECT"],
  "priceFloors": { "CARRY": 4.00, "INSPECT": 6.50 },
  "priceCeilings": { "CARRY": 20.00, "INSPECT": 50.00 },
  "geofence": {
    "enabled": true,
    "bounds": { "lat": [52.4100, 52.4140], "lng": [13.5200, 13.5260] }
  },
  "timeWindows": [
    { "days": ["MON","TUE","WED","THU","FRI"], "start": "08:00", "end": "20:00" }
  ],
  "reputationThreshold": 4500,
  "maxConcurrentJobs": 2,
  "maxDailyWithdraw": 500,
  "autoAccept": true,
  "blacklist": ["0xabc...123"],
  "requiredCapabilities": ["RTK_GPS"],
  "emergencyPaused": false
}
```

The policy lives off-chain — it's an Operator's local document interpreted by the robot SDK at offer-arrival time. **It is not enforced by the contract.** The contract enforces the *minimum* (robot is registered, robot is active, robot's posted offering price is met). The policy enforces *the Operator's preferences on top*.

Why this separation? Putting policy on-chain would force a Solidity DSL nobody wants to maintain and gas-cost every job rejection. Keeping it off-chain in the SDK means an Operator can change pricing in real time, run A/B tests on geofences, and ship policy updates without a contract migration.

---

## The primitives

There are exactly **ten** policy primitives in v1. Each is independently composable, each has a default, each has a defined conflict resolution rule.

### 1. `acceptedTaskTypes` — capability filter

**Type:** `TaskType[]`  (subset of `["CARRY","NAVIGATE","INSPECT","SORT"]`)
**Default:** All four
**Effect:** Robot rejects offers whose `taskType` is not in the list.

**Why this exists:** A Unitree G1 humanoid running INSPECT firmware shouldn't accept CARRY jobs even if its on-chain registration lists CARRY as a capability — the registration is the contract's view, the policy is the operator's runtime constraint.

**Conflict:** If `acceptedTaskTypes` is empty, the robot accepts nothing. This is treated as `emergencyPaused: true`.

---

### 2. `priceFloors` — minimum payout per task type

**Type:** `Record<TaskType, number>` (USDC, two-decimal precision)
**Default:** `{}` (no floor)
**Effect:** Robot rejects offers where `bid < priceFloors[taskType]`.

**Why this exists:** Robots have unit-economics floors. A G1 at $90k retail with a 5-year amortization needs ≥ $X per hour to not lose money. The price floor encodes that constraint.

**Conflict:** If `priceFloors[taskType]` is undefined, the floor is 0 — the offer is accepted regardless of price. Operators *should* always set a floor; the default of "accept anything" is intentionally hostile to indifferent operators.

---

### 3. `priceCeilings` — sanity-check maximum

**Type:** `Record<TaskType, number>` (USDC)
**Default:** `{}` (no ceiling)
**Effect:** Robot rejects offers where `bid > priceCeilings[taskType]`.

**Why this exists:** A suspiciously-high bid is a red flag — either the client is trying to lure the robot off its territory, or the agent is mispriced and might dispute, or the offer is a honeypot. Ceilings let Operators auto-decline "too good to be true."

**Conflict:** Undefined means infinity. Always-higher always-wins.

---

### 4. `geofence` — spatial boundary

**Type:** `{ enabled: bool, bounds: { lat: [min, max], lng: [min, max] } }`
**Default:** `{ enabled: false }`
**Effect:** Robot rejects offers whose **destination** coordinates fall outside the bounding box.

**v1 limitation:** Rectangular bounds only — no polygons. Polygons land in v1.5 (`COMPONENTS/GEOFENCE-EDITOR.md`).

**Why this exists:** A warehouse robot should not accept a job that takes it across the parking lot to the neighboring building, even if the price is good. Operators install a geofence around their physical premises.

**Conflict:** If `geofence.enabled = true` and `bounds` is malformed (min > max), the geofence is treated as rejecting everything → effectively `emergencyPaused`. SDK should log a structured warning.

---

### 5. `timeWindows` — when robots are available

**Type:** `Array<{ days: Day[], start: "HH:MM", end: "HH:MM", timezone?: string }>`
**Default:** `[]` (no restriction — 24/7)
**Effect:** Robot rejects offers if the *current time* (at offer arrival) is outside all configured windows.

**Why this exists:** Warehouses operate on shifts. A robot whose human supervisor isn't on-site shouldn't take new jobs at 03:00 even if its battery is full.

**Edge cases:**
- Empty array = no restriction (default).
- A window with `start > end` wraps midnight (`"22:00"–"06:00"` is valid).
- `timezone` defaults to Operator's configured TZ; can be overridden per window for multi-region fleets.
- Windows are evaluated against the offer arrival time, not the SLA deadline. A 30-minute job that starts at 19:55 will run past 20:00 — this is allowed. Operators who want hard cutoffs should set the window end earlier than their physical close.

---

### 6. `reputationThreshold` — won't work for low-rep agents

**Type:** `uint256` (scaled 0–10000, where 5000 = 5.0)
**Default:** `0` (no threshold)
**Effect:** Robot rejects offers from agents whose on-chain reputation is below the threshold.

**v1 note:** Agent reputation isn't tracked on-chain yet (only robot reputation is). This primitive is a forward-compatible no-op in v1 — it's accepted in the policy schema, the field is read, but always passes. Lands fully in v1.5 when `ROVARegistry` adds agent reputation.

**Why this exists in v1 anyway:** Operators authoring policies today should be able to *think in* this primitive, so the schema is stable when it activates.

---

### 7. `maxConcurrentJobs` — robot-level parallelism cap

**Type:** `uint`
**Default:** `1`
**Effect:** Robot rejects offers if it already has `maxConcurrentJobs` active.

**Why this exists:** Defaulting to 1 means a robot can't get double-booked, which is the safe default for physical work. Operators with robots capable of legitimate parallelism (e.g., a robot doing INSPECT while charging) can lift the cap.

**Note:** This is a *per-robot* cap. There is no fleet-level cap in v1 — each robot manages its own queue. Fleet-level parallelism management is a v2 feature.

---

### 8. `maxDailyWithdraw` — accumulation throttle

**Type:** `number` (USDC)
**Default:** `0` (no cap — withdraw freely)
**Effect:** Does not affect offer acceptance. Applies to settlement → operator wallet sweeps. If the robot's earnings today exceed `maxDailyWithdraw`, settlements still happen (escrow → robot wallet) but the SDK suppresses the operator-side auto-sweep.

**Why this exists:** Defense in depth. If a robot wallet is compromised, an attacker shouldn't be able to drain a month's earnings in a day. The cap forces the attacker to either wait or trigger an Operator alert by trying to bypass it.

**Conflict:** `0` means no cap (the most permissive default). Operators handling real value should set this to ~1.5x daily expected earnings — high enough to not throttle normal days, low enough to flag a runaway agent.

---

### 9. `autoAccept` — gated vs. ungated acceptance

**Type:** `boolean`
**Default:** `true`
**Effect:** If `true`, offers that pass all other policy checks are accepted automatically. If `false`, offers are surfaced to the Operator dashboard for manual approval.

**Why this exists:** Two modes of operation. Mature fleets want auto-accept (the whole point of the SDK is to remove the human from the loop). New fleets in trust-building mode want manual approval (the operator wants to see every offer before committing the robot).

**Note:** When `autoAccept: false` is on, the Operator has *the SLA window* to approve before the offer expires. Late approvals are rejected by the SDK. The Operator dashboard should show a countdown.

---

### 10. `blacklist` — refuse specific clients

**Type:** `address[]`
**Default:** `[]`
**Effect:** Robot rejects offers from any wallet in the list.

**Why this exists:** A client that disputed a previous job in bad faith, or a known scam wallet, or a competitor's agent the Operator doesn't want to subsidize. The opposite (`allowlist`) is intentionally not v1 — allowlists are too restrictive for a marketplace.

**Conflict:** If a wallet is on both the implicit allowlist (via `reputationThreshold`) and the explicit `blacklist`, the blacklist wins.

---

### Plus: `requiredCapabilities` (compound) and `emergencyPaused` (kill-switch)

These two aren't independent primitives — they're meta:

**`requiredCapabilities: string[]`** — Off-chain capability tags the robot must have. Examples: `RTK_GPS`, `LIDAR`, `CAMERA_4K`, `INDOOR_NAV`, `OUTDOOR_NAV`, `RAIN_RATED`. The SDK reads the robot's local capability manifest and rejects offers whose `requiredCapabilities` aren't all present. Useful for jobs that the on-chain `taskType` alone doesn't disambiguate (e.g., an outdoor CARRY job that needs rain-rated robots).

**`emergencyPaused: boolean`** — Hard stop. When `true`, the robot rejects all offers regardless of other policy. Operator's red button. Survives SDK restart (persisted to local state). Recovery requires explicit Operator action — not a timer.

---

## Evaluation order

The SDK evaluates an incoming offer against the policy in this order, **failing fast** on the first rejection:

```
1. emergencyPaused        → if true, REJECT
2. acceptedTaskTypes      → if taskType not in list, REJECT
3. blacklist              → if client in list, REJECT
4. reputationThreshold    → if agent_rep < threshold (v1.5+), REJECT
5. priceFloors            → if bid < floor, REJECT
6. priceCeilings          → if bid > ceiling, REJECT
7. geofence               → if destination outside bounds, REJECT
8. timeWindows            → if now outside all windows, REJECT
9. requiredCapabilities   → if robot missing any tag, REJECT
10. maxConcurrentJobs     → if robot saturated, REJECT
11. autoAccept            → if true, ACCEPT
                          → if false, ESCALATE to Operator
```

Order matters for two reasons:

- **Cheap checks first.** `emergencyPaused` is a single boolean read. `geofence` is an integer comparison. We don't want to evaluate `timeWindows` (timezone math) before we know the offer is even for a task type we serve.
- **Privacy.** `blacklist` runs before any economic check. We don't reveal "here's what you'd need to pay to be accepted" to a blacklisted address.

The SDK emits a structured `PolicyRejected` event for every rejection: `{ jobId, reason: "PRICE_FLOOR" | "GEOFENCE" | ..., context: {...} }`. These events feed the Operator's triage UI.

---

## Templates

Operators don't author policies from scratch. The SDK ships with three templates the Operator can adapt:

### Template 1: **"Cautious Warehouse"**

```json
{
  "acceptedTaskTypes": ["CARRY", "SORT"],
  "priceFloors": { "CARRY": 5.00, "SORT": 3.50 },
  "priceCeilings": { "CARRY": 25.00, "SORT": 15.00 },
  "geofence": { "enabled": true, "bounds": { "lat": [...], "lng": [...] } },
  "timeWindows": [{ "days": ["MON-FRI"], "start": "08:00", "end": "18:00" }],
  "reputationThreshold": 4000,
  "maxConcurrentJobs": 1,
  "autoAccept": false,
  "blacklist": [],
  "requiredCapabilities": ["INDOOR_NAV"],
  "emergencyPaused": false
}
```

A trust-building fleet. Manual approval on every offer, geofenced to the building, only known-good agents, tight price band.

### Template 2: **"24/7 Fulfillment"**

```json
{
  "acceptedTaskTypes": ["CARRY"],
  "priceFloors": { "CARRY": 4.50 },
  "priceCeilings": { "CARRY": 30.00 },
  "geofence": { "enabled": true, "bounds": { "lat": [...], "lng": [...] } },
  "timeWindows": [],
  "reputationThreshold": 3000,
  "maxConcurrentJobs": 2,
  "autoAccept": true,
  "requiredCapabilities": ["INDOOR_NAV", "RTK_GPS"],
  "emergencyPaused": false
}
```

A mature fleet. Round-the-clock, auto-accept, hardware-attested precision required, double-booking allowed.

### Template 3: **"Outdoor Last-Mile"**

```json
{
  "acceptedTaskTypes": ["CARRY", "NAVIGATE"],
  "priceFloors": { "CARRY": 8.00, "NAVIGATE": 6.00 },
  "priceCeilings": { "CARRY": 80.00, "NAVIGATE": 40.00 },
  "geofence": { "enabled": true, "bounds": { "lat": [52.40, 52.44], "lng": [13.50, 13.55] } },
  "timeWindows": [{ "days": ["MON-SUN"], "start": "07:00", "end": "21:00" }],
  "reputationThreshold": 4500,
  "maxConcurrentJobs": 1,
  "autoAccept": true,
  "requiredCapabilities": ["OUTDOOR_NAV", "RAIN_RATED", "RTK_GPS"],
  "emergencyPaused": false
}
```

A delivery-grade fleet. Wider geofence (city district, not warehouse), higher prices, daylight only, weather-resistant required.

The Policy Editor UI (`COMPONENTS/POLICY-EDITOR.md`) starts the Operator from a template and lets them tune.

---

## Authoring rules

Three rules an Operator should follow when authoring a policy:

1. **Set a price floor for every task type you serve.** The default of "accept any price" is a footgun. Operators routinely lose money on the first week of a new fleet because they assumed the marketplace would price things sanely. It won't.
2. **Geofence early, narrow it later.** Start with a geofence twice the size of your premises. Watch where rejected offers cluster on the heatmap. Tighten in.
3. **Don't lift `maxConcurrentJobs > 1` until you've reviewed a robot's failure rate on single jobs.** Parallel jobs amplify whatever's already going wrong.

---

## Versioning and migration

Policies carry a `version` integer (currently `1`). The SDK refuses to load a policy with a version it doesn't know how to evaluate, *failing closed* — the robot is `emergencyPaused`-equivalent until the SDK is upgraded.

When v2 adds new primitives (e.g., `weatherRequirement`, `customerSegment`, `beaconRequired`), v1 policies remain valid — new fields default to permissive. v2 policies on a v1 SDK are rejected outright. This is intentional. **Permissive forward compat is dangerous for policy** — a missing field could mean "no restriction" when the Operator meant the opposite.

---

## What policies do *not* do

- **Pricing.** Policies set *floors* and *ceilings*, not the actual posted price of an offering. The offering price lives on-chain in `ROVARegistry.JobOffering.priceUsdc` and is set per-robot when the operator publishes offerings (see `ROBOT-IDENTITY.md`).
- **Routing.** A policy decides whether to accept an offer. It does not decide which robot in the fleet takes it. Fleet-level routing is the Operator's separate concern (v2; `ARCH/MULTI-WAREHOUSE.md`).
- **Proof requirements.** Whether the verifier accepts a proof is set per-deployment (`gpsTolerance` admin call), not per-policy. A policy can *require* `RTK_GPS` capability, but it doesn't change the tolerance.
- **Settlement timing.** Policies don't control when escrow releases. The contract does, automatically, when proof verifies.

The boundary is clean: **policies are about which offers a robot accepts**. Everything else lives in the contract or in the fleet-level Operator config.

---

## Related

- `COMPONENTS/POLICY-EDITOR.md` — the plain-language UI the Operator authors in
- `COMPONENTS/GEOFENCE-EDITOR.md` — polygon-drawing tool (v1.5)
- `STATE-MACHINE.md` — where policy evaluation sits in the task lifecycle
- `AGENT-BROWSE.md` — how an agent discovers offerings (the inverse of policy)
- `OPS/MONITORING.md` — policy rejection rate as a fleet-health signal
