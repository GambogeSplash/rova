# POLICY-EDITOR

> The Operator's policy authoring surface. Plain-language rule builder over the 10 policy primitives.

This is the flow spec for the `/dashboard/policies/[id]` surface. The component-level spec for the in-page editor widget lives in `COMPONENTS/POLICY-EDITOR.md`.

---

## Audience

Operator. Authoring or editing a policy that controls how their robots evaluate incoming offers.

---

## Entry points

- `/dashboard/policies` — list of all policies → click one → editor
- `/dashboard/policies/new` — start a new policy from a template
- `/dashboard/fleet/[robotId]/policy` — edit the policy attached to one robot
- `/onboard/operator/3` — first-time policy authoring (compact subset; see `ONBOARDING.md`)

---

## Two modes

### Mode 1: Library view (`/dashboard/policies`)

```
┌────────────────────────────────────────────────────────────────┐
│  POLICIES                                            [+ New]  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Cautious Warehouse                       3 robots       │  │
│  │  Indoor · 4.0+ rep · Mon-Fri 18-06 · auto-accept off    │  │
│  │                                                    Edit →│  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Outdoor Last-Mile                        2 robots       │  │
│  │  Outdoor + rain-rated · 4.5+ rep · 07-21                 │  │
│  │                                                    Edit →│  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

Each row shows:
- Policy name (operator-named, defaults to "Policy #1", "Policy #2"...)
- Robot count using this policy
- 1-line summary of the most-important constraints
- Edit link

### Mode 2: Editor view (`/dashboard/policies/[id]`)

```
┌──────────────────────────────────────────────────────────────────────┐
│  EDIT POLICY · Cautious Warehouse                                    │
│                                                                      │
│  Applies to: G1-ALPHA, G1-BETA, G1-GAMMA   ☑ Edit applies to all     │
│                                                                      │
│  ─── ACCEPTANCE ──────────────────────────────────────────────────── │
│                                                                      │
│  Accept task types                                                   │
│  [✓] CARRY     [✓] SORT     [ ] NAVIGATE     [ ] INSPECT             │
│                                                                      │
│  Required capabilities                                               │
│  [+ INDOOR_NAV] [+ RTK_GPS] [+]                                       │
│                                                                      │
│  Blacklist (specific clients)                                        │
│  0xbad1...c0de              [×]                                       │
│  [+ Add address]                                                     │
│                                                                      │
│  ─── ECONOMICS ──────────────────────────────────────────────────── │
│                                                                      │
│  Price floors (USDC)                                                 │
│  CARRY    $4.50 ────●────────── $50                                   │
│  SORT     $3.00 ──●──────────── $30                                   │
│                                                                      │
│  Price ceilings (USDC) — reject suspiciously-high bids               │
│  CARRY    $50 (off)                                                  │
│  SORT     $30 (off)                                                  │
│  [Enable ceilings]                                                   │
│                                                                      │
│  ─── PLACE + TIME ──────────────────────────────────────────────── │
│                                                                      │
│  Geofence                                                            │
│  ☑ Reject offers outside bounds                                      │
│  [📍 Drawn around your warehouse — adjust on map]                    │
│                                                                      │
│  Time windows                                                        │
│  [✓] Mon-Fri 18:00 → 06:00                                  [Edit]   │
│  [✓] Sat-Sun all day                                        [Edit]   │
│  [+ Add window]                                                      │
│                                                                      │
│  ─── REPUTATION + LIMITS ────────────────────────────────────────── │
│                                                                      │
│  Minimum client reputation                                           │
│  [ 4000 / 5000 = 4.0+ rating ]                                       │
│                                                                      │
│  Max concurrent jobs per robot                                       │
│  [ 1 ▾ ]                                                              │
│                                                                      │
│  Max daily withdraw (USDC)                                           │
│  [ 500 ]   ←  defense in depth; pause sweeps if exceeded             │
│                                                                      │
│  ─── BEHAVIOR ──────────────────────────────────────────────────── │
│                                                                      │
│  Auto-accept offers that pass all rules                              │
│  (●) On — for mature fleets                                          │
│  ( ) Off — surface to dashboard for manual approval                  │
│                                                                      │
│  Emergency pause (rejects all offers immediately)                    │
│  ( ) Paused   (●) Active                                             │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  [ Test against last 24h of offers ]    [ Save ]   [ Save & deploy ] │
└──────────────────────────────────────────────────────────────────────┘
```

The editor groups the 10 primitives into 4 conceptual buckets:
- **Acceptance** (what tasks, who from)
- **Economics** (price floor and ceiling)
- **Place + time** (where, when)
- **Reputation + limits** (which agents, how many concurrent)
- **Behavior** (auto vs manual, emergency pause)

---

## "Test against last 24h" — the dry-run

The Operator clicks "Test." A modal opens:

```
┌─────────────────────────────────────────────────────────────┐
│  DRY RUN AGAINST LAST 24H                                   │
│                                                             │
│  Simulating this policy against the 89 offers your fleet    │
│  received in the last 24 hours…                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Would accept:    62 offers   ($284.70 gross earnings)      │
│  Would reject:    27 offers                                 │
│                                                             │
│  Reject breakdown:                                          │
│    PRICE_FLOOR          12     ($43.20 missed)              │
│    GEOFENCE              8     (outside bounds)              │
│    BLACKLIST             4     (single client repeating)     │
│    TIME_WINDOW           3                                  │
│                                                             │
│  Compared to current policy:                                 │
│    +14 more accepted, +$67 estimated gross                   │
│                                                             │
│                                            [ Close ]  [ Apply ] │
└─────────────────────────────────────────────────────────────┘
```

Operator can see exactly what changes before saving.

---

## Save mechanics

### `Save`
- Persists locally (SDK local store)
- Persists to operator's cloud sync (Postgres) if enabled
- Does NOT push to robots immediately

### `Save & deploy`
- Same as Save, plus
- SDK pushes the new policy to each robot's local store
- Robots reload at next heartbeat tick (≤ 10 s)

Some operators want "stage and review" (Save) vs "deploy now" (Save & deploy). The two-button explicit choice prevents accidents.

---

## Conflict resolution

Multiple robots can share a policy (most common case) OR have their own. The editor handles three cases:

### Case 1: "Edit applies to all" checked (default)
Edit propagates to every robot using this policy. The next heartbeat cycle picks it up.

### Case 2: "Edit applies to all" unchecked
Editing only affects the robot named in the URL path (`/dashboard/fleet/[robotId]/policy`). Forks a new policy if the change diverges from the shared one. Robots not affected.

### Case 3: Stale policy detected
SDK detects an out-of-sync local copy on a robot. The editor shows a warning:

```
⚠ G1-ALPHA's local policy is 26h old. Sync before editing, or your changes will overwrite local-only changes.

  [ Pull from G1-ALPHA ]    [ Overwrite anyway ]
```

---

## Versioning

Every save bumps a monotonic version number stored with the policy. The robot's SDK includes the policy version in heartbeats:

```
heartbeat.policy_version = 7
operator.dashboard.policy.current_version = 8
→ shows "G1-ALPHA pending policy update (v7 → v8)"
```

Updates land at the next heartbeat tick after the robot's SDK fetches the new policy. Typically < 10 s lag.

---

## Audit log

Every save writes to `audit_log`:

```json
{
  "ts": "...",
  "actor": "0xoperator...",
  "action": "policy.update",
  "policy_id": "cautious-warehouse",
  "diff": {
    "priceFloors.CARRY": { "old": 4.00, "new": 4.50 }
  }
}
```

Visible to the operator under `/dashboard/policies/[id]/history`. Useful for:
- Debugging "why did my fleet reject so much yesterday"
- Compliance (regulated industries)
- Team coordination (multi-person operator teams)

---

## Edge cases

- **Two operators edit simultaneously** — last save wins; loser sees "Your save was overwritten by [other-address]. Pull latest to merge."
- **Editor times out** — local draft persists in browser; on return, "You have unsaved changes from N hours ago" prompt
- **Save with invalid policy** — disabled save button; inline errors at the broken fields
- **Empty `acceptedTaskTypes`** — warning: "This policy rejects everything. Are you trying to pause?" with explicit confirm
- **Geofence inverted bounds** — warning: "Bounds inverted; would reject all offers"
- **Operator deletes a policy referenced by active robots** — confirm modal: "G1-ALPHA, G1-BETA use this policy. They'll move to the default template if you delete. Proceed?"

---

## Telemetry

```
policy.editor.viewed             (policyId, mode = library | edit)
policy.editor.field_changed      (field, oldValue, newValue)
policy.editor.dry_run            (acceptedCount, rejectedCount, deltaCount)
policy.editor.saved              (savedAndDeployed: bool, diffSize)
policy.editor.cancelled
policy.editor.conflict_overwrite (otherAddress)
```

---

## Related

- `POLICIES.md` — the 10 primitives this editor exposes
- `COMPONENTS/POLICY-EDITOR.md` — the in-page widget's component spec
- `ONBOARDING.md` § Step 3 — the compact version used on first run
- `ERRORS.md` § Po — policy errors and validation
- `DASHBOARD.md` — where the operator lands after deploying a change
