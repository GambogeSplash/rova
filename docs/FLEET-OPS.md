# FLEET-OPS

> Day-to-day fleet controls — pause/resume, adjust policy mid-flight, emergency-stop, rotate session keys. The drawer the Operator opens when something needs to change *now*.

---

## Audience

Operator with at least one robot live, needing to make a runtime change. Common triggers:
- A robot is misbehaving and needs to stop accepting offers
- Geofence needs adjustment because a new client moved
- Battery thermals on G1-DELTA need a maintenance pause
- Price floor is too low on a Friday night surge — bump it
- Suspected key compromise — rotate session keys

---

## Entry points

- `/dashboard/fleet` — list view with per-robot controls
- `/dashboard/fleet/[robotId]` — single-robot deep view with all controls
- `/dashboard/emergency` — fleet-wide kill switch
- Right-click a robot tile from `/dashboard` → context menu with quick actions

---

## The fleet view (`/dashboard/fleet`)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  FLEET                                              [+ Add robot]        │
│                                                                          │
│  Filter:  Status [ All ▾ ]  Model [ All ▾ ]  Sort by [ Earnings ▾ ]      │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  G1-ALPHA · Unitree G1                              ●  active      │ │
│  │  0x71C7…4e2F · battery 87% · rep 4.92                               │ │
│  │  Today: $48.21 (12 jobs) · This week: $387.21                       │ │
│  │  [ Pause ] [ Edit policy ] [ Open detail → ]                        │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  G1-DELTA · Unitree G1                              ⚠  charging    │ │
│  │  0x4f0E…aE45 · battery 14% (thermal warning) · rep 4.41             │ │
│  │  Today: $0 (paused for thermal) · This week: $43.12                 │ │
│  │  [ Resume ] [ Maintenance pause ] [ Open detail → ]                 │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  …                                                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

Status pill colors: active (green), charging (amber), maintenance (slate), paused (alert).

---

## Single-robot view (`/dashboard/fleet/[robotId]`)

The deep view shows everything for one robot in a single screen:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  G1-ALPHA  ·  Unitree G1  ·  Robot #1                                   │
│  0x71C7…4e2F  ·  registered May 14  ·  staked 100 ROVA                  │
│                                                                          │
│  ───── HEALTH ───────────────────────────────────────────────────────── │
│                                                                          │
│  Status        ● active                                                  │
│  Battery       87% (charging)                                            │
│  Last heartbeat  3s ago                                                  │
│  WiFi          -52 dBm (good)                                            │
│  Uptime        5d 14h                                                    │
│                                                                          │
│  ───── EARNINGS ─────────────────────────────────────────────────────── │
│                                                                          │
│  This week     $387.21  (88 completed · 2 failed)                        │
│  All time      $4,221.18 (612 completed · 24 failed)                     │
│  Current bal    $48.21 in robot wallet                                   │
│                                                                          │
│  ───── POLICY ───────────────────────────────────────────────────────── │
│                                                                          │
│  Active policy:  Cautious Warehouse  (v8)                                │
│  Last synced:    2 min ago                                               │
│  [ Edit policy ]  [ Apply different policy ]                             │
│                                                                          │
│  ───── RUNTIME CONTROLS ────────────────────────────────────────────── │
│                                                                          │
│  [ Pause acceptance ]                  Stop taking new offers            │
│  [ Cancel active job ]                 Refund any in-flight bounty       │
│  [ Maintenance mode ]                  Pause + flag for inspection       │
│  [ Rotate session key ]                Generate new key on the SDK       │
│  [ Adjust offerings ]                  Add / remove (taskType, price)    │
│                                                                          │
│  ───── DANGER ZONE ──────────────────────────────────────────────────── │
│                                                                          │
│  [ Withdraw stake & deactivate ]       Remove robot from registry        │
└──────────────────────────────────────────────────────────────────────────┘
```

Each runtime control has clear language about what happens.

---

## Pause acceptance

Sets the robot's policy to `emergencyPaused: true` locally. The robot won't accept any new offer until resumed. In-flight jobs continue.

UX:
1. Click "Pause acceptance"
2. Confirmation modal: "G1-ALPHA will stop accepting new offers. Active job #7c2a continues. Resume any time."
3. Click "Confirm"
4. SDK pushes the policy update to the robot at next heartbeat (≤ 10s)
5. Robot's status pill turns to "paused"

To resume: button text changes to "Resume acceptance." Same flow in reverse.

---

## Cancel active job

When a robot is mid-job but something needs to stop:
1. Click "Cancel active job"
2. Modal warns: "Cancelling JOB-#7c2a will:
   - Robot stops execution
   - Bounty refunds to agent at SLA deadline (~5 min from now)
   - Robot stake slashed -10% of bid"
3. Confirm
4. SDK sends abort signal to robot SDK → robot publishes `phase: aborted` heartbeat
5. Job auto-fails at deadline via `forceFailJob` (or sooner if operator triggers manually)

This is a destructive action — slash happens. Use only when continuing would cause damage (robot stuck, dangerous obstacle, wrong destination).

---

## Maintenance mode

A softer pause: the robot is offline for human inspection.

1. Click "Maintenance mode"
2. Modal asks: "Reason?" (optional free text)
3. SDK pauses + the robot's status pill turns slate ("maintenance")
4. Robot wallet is marked "maintenance" in the registry (off-chain flag — doesn't affect contract)
5. Operator can resume any time

Difference from "Pause acceptance": maintenance carries an attached reason + log entry; useful for ops handoff between team members.

---

## Rotate session key

When session key compromise is suspected or quarterly rotation is policy:

1. Click "Rotate session key"
2. Modal: "Generate a new session key for G1-ALPHA's SDK?"
3. UI generates a fresh key locally; commits the hash on-chain via `ROVAWallet.addSessionKey`
4. Old session key is revoked via `ROVAWallet.revokeSessionKey`
5. SDK on the robot picks up the new key at next heartbeat
6. Operator downloads the new key file (encrypted) for backup

Two on-chain transactions (add + revoke). The robot doesn't lose time — between the add and the revoke, both keys are valid.

---

## Adjust offerings

The robot's published `JobOffering`s — what task types + prices it advertises. Editable runtime.

```
G1-ALPHA's offerings:
☑ CARRY · $4.50 · 30 min SLA   [ Adjust price ▾ ] [ Remove ]
☑ SORT  · $3.00 · 30 min SLA   [ Adjust price ▾ ] [ Remove ]
[ + Add offering ]
```

Adjusting a price calls `ROVARegistry.publishOffering` (creates new offering + deactivates old). A few seconds of overlap during which both offerings are visible to agents — the SDK handles this gracefully.

Common use case: weekend price bump.

---

## Withdraw stake & deactivate

The terminal control. Removes the robot from the registry, returns stake.

1. Click "Withdraw stake & deactivate"
2. Modal warns: "G1-ALPHA will be removed from the registry. Stake (100 ROVA) returns to your wallet. This is final."
3. Type the robot name to confirm (anti-fat-finger)
4. SDK calls `ROVARegistry.deactivateRobot` (releases stake), then unlinks
5. Robot wallet is preserved (the ERC-4337 wallet still exists; just unaffiliated from the registry)

The robot can be re-registered later by calling `registerRobot` again, but it'll get a new `robotId` and start fresh reputation.

---

## `/dashboard/emergency` — fleet-wide kill switch

A single page with a single button:

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  EMERGENCY                                                          │
│                                                                     │
│  Pause every robot in your fleet from accepting new offers.         │
│  Active jobs continue to completion.                                │
│                                                                     │
│  This is a soft pause — no slashing, no stake at risk. You can      │
│  resume any time from /dashboard/fleet.                             │
│                                                                     │
│                       [ PAUSE EVERY ROBOT ]                          │
│                                                                     │
│  ──────────────────────────────────────────────────────────────── │
│                                                                     │
│  HARD STOP (advanced)                                               │
│                                                                     │
│  Aborts every active job + pauses fleet. Slashes will fire on the  │
│  aborted jobs. Use only when continuing would cause damage.         │
│                                                                     │
│                       [ HARD STOP EVERYTHING ]                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

Both buttons require typed confirmation. Hard stop also requires a second signature (multi-sig style — even single-EOA operators have to sign twice).

---

## Audit log

Every fleet-ops action lands in the audit log:

```
2026-05-25T14:18:43Z  action=robot.paused  actor=0xabc...  target=robot/1  reason="thermal warning"
2026-05-25T14:18:55Z  action=robot.session_key.rotated  actor=0xabc...  target=robot/1
2026-05-25T14:32:01Z  action=robot.resumed  actor=0xabc...  target=robot/1
```

Visible to the operator at `/dashboard/audit`. Useful for team coordination and incident review.

---

## Edge cases

- **Pause clicked while robot is mid-job** → "G1-ALPHA is currently executing JOB-X. Pause takes effect after current job completes."
- **Network slow on rotate-session-key** → multi-step progress, retry support per step
- **Hard-stop on a fleet with 20 robots** → each abort is a separate event but batched per-robot UserOp; progress bar
- **Operator tries to deactivate a robot with non-zero wallet balance** → "G1-ALPHA's wallet has $48.21. Sweep first, then deactivate."
- **Two operators (multi-sig Safe) disagree on a pause** → one signature isn't enough; needs threshold from Safe

---

## Telemetry

```
fleet.viewed                       (robotCount, statusBreakdown)
fleet.robot.opened                 (robotId)
fleet.action.taken                 (robotId, action, reason?)
emergency.viewed
emergency.soft_pause               (robotCount)
emergency.hard_stop                (robotCount, active_jobs_aborted)
```

---

## Related

- `DASHBOARD.md` — quick-pause from the dashboard
- `POLICIES.md` § emergencyPaused — what the soft pause sets
- `AUTH.md` — session key rotation
- `STATE-MACHINE.md` § ASSIGNED → FAILED — the abort path
- `ERRORS.md` § J-01 — heartbeat lost is the natural trigger for many of these actions
- `OPS/INCIDENT.md` — playbooks where these controls get used
