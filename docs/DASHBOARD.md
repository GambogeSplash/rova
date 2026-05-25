# DASHBOARD

> The Operator's Today. The first thing they see at 07:00, the last thing they check at 23:00. Designed for triage, not exploration.

`/dashboard` is the load-bearing screen of the entire Operator product. Every other screen in the product is reachable from it; most operators spend 80% of their time here.

---

## Audience

Operator who has at least one robot live. Comes to the dashboard to:
- See overnight earnings at a glance
- Approve incoming offers (when `autoAccept: false`)
- Triage anomalies (offline robot, failed proof, dispute incoming)
- Decide whether to flip emergency pause
- Sweep accumulated earnings to treasury

---

## Layout

Single page with a primary grid + a right-rail. No tabs (those are separate URLs under `/dashboard/*`).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ROVA · Today                                                       [⌘K]    │
│  Sun May 25 · 07:14                                                         │
│                                                                             │
│  ┌─────────────────────────────┬─────────────────────────────────────────┐  │
│  │  Earnings overnight          │  Fleet at a glance                       │  │
│  │  $221.04                     │                                          │  │
│  │  +18.2% vs 7d avg            │  ●● 6 active   ○ 1 offline               │  │
│  │  47 jobs settled             │                                          │  │
│  │  3 failed (slashes -$8.40)  │  Avg rep:        4.91                    │  │
│  │                              │  Avg comp time:  7m 42s                   │  │
│  │  [Sweep to treasury]         │  Policy rejections (24h): 16              │  │
│  └─────────────────────────────┴─────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ALERTS (3)                                                          │    │
│  │  ⚠ G1-DELTA charging time +18% on past week — flag for inspection   │    │
│  │  ⚠ JOB-7c3a awaiting settlement (verified 8 min ago)                │    │
│  │  ⚠ Policy rejection cluster — 8 offers rejected at $3.80 floor       │    │
│  │                                              [ See all alerts → ]   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  INCOMING OFFERS (4 pending approval)                  [Auto-on ▾]   │    │
│  │                                                                     │    │
│  │  $7.50 CARRY · 12 min SLA · Aboki-Restock-Bot (rep 4.87)            │    │
│  │  G1-BETA · Rack A2 → Dispatch Bay 1                  Approve  Decline│    │
│  │                                                                     │    │
│  │  $5.10 SORT · 8 min SLA · Tetris-Agent (rep 4.62)                   │    │
│  │  G1-GAMMA · Bay 2 → Rack C1                          Approve  Decline│    │
│  │                                                                     │    │
│  │  …                                                                  │    │
│  │                                                  [ See registry → ] │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ACTIVE JOBS (3)                                                    │    │
│  │  ●  G1-ALPHA · CARRY  · 5:42/12:00 SLA · 47% done                   │    │
│  │  ●  G1-BETA  · CARRY  · 2:18/15:00 SLA · navigating_pickup           │    │
│  │  ●  G2-OMEGA · SORT   · 0:45/10:00 SLA · escrow_locked              │    │
│  │                                                  [ See all jobs →  ]│    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

Persistent left sidebar (per `IA.md`) sits to the left of all this content.

---

## Five tiles, in order of leverage

### Tile 1: Earnings overnight

The headline number. Auto-defaults to "since last sweep" — typically the last 24 hours. Operator can switch the window (8h / 24h / 7d / 30d / since-sweep).

Components:
- Gross earnings (USDC settled to robot wallets)
- Delta vs comparable prior period
- Jobs completed
- Jobs failed (with total slashes deducted)
- "Sweep to treasury" CTA

The "Sweep to treasury" button triggers a batched UserOp that moves all USDC from every robot wallet to the operator's treasury wallet. Single signature, multi-wallet sweep. Gas estimate shown before signing.

### Tile 2: Fleet at a glance

Quick fleet-health snapshot:
- Active count (heartbeat in last 30s)
- Offline count
- Average reputation across fleet
- Average completion time (median; p95 in tooltip)
- Policy rejection count

Each metric clickable → drills into `/dashboard/fleet` filtered.

### Tile 3: Alerts panel

The triage surface. Each alert is structured: (severity, robot/job ref, one-line description, primary action).

Severity:
- 🔴 **High** — robot down, failed proof, dispute opened, large slash
- 🟡 **Medium** — policy reject cluster, deadline approaching, stake low
- 🔵 **Info** — settlement pending, daily withdraw cap approaching

Alerts are read-once. Dismiss button clears them; they don't reappear.

Slide-in alerts panel (right-edge drawer) opens via "See all alerts" — full alerts history with filter/search.

### Tile 4: Incoming offers (only shown when `autoAccept: false`)

The Operator's manual-approval queue. Each row:
- Bounty + task type + SLA
- Client identity (with rep dot)
- Which robot would take it + pickup → dropoff
- Approve / Decline buttons

When `autoAccept: true`, this tile is hidden and replaced with a single row: "Auto-accept on. 12 offers approved automatically in the last hour. [ Switch to manual ]"

### Tile 5: Active jobs

What's in flight right now. Each row:
- Robot + task type
- Elapsed time / SLA budget
- Current phase (live, updates via SSE)
- Click → `/dashboard/jobs/[id]` for detail

Limited to top 8; "See all jobs" links to the full ledger.

---

## Live data flow

All five tiles subscribe to the same SSE stream from the indexer:

```
GET /api/v1/stream/operator/0xabc...
```

Events:
- `job.posted` — refresh tile 4 if relevant offering
- `job.assigned` — refresh tiles 4 + 5
- `job.completed` — refresh tiles 1, 2, 5
- `job.failed` — refresh tiles 1, 2, 3, 5
- `proof.rejected` — refresh tile 3
- `robot.heartbeat_lost` — refresh tile 3
- `policy.rejected` — refresh tile 3 (debounced)

On disconnect, the indicator (`U-02` per `ERRORS.md`) shows yellow; auto-reconnect.

---

## Persistent action bar (footer)

Always visible at the bottom of the dashboard viewport:

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ⌘K Search    F Toggle fleet    R Approve next offer    P Pause robot     │
└────────────────────────────────────────────────────────────────────────────┘
```

Keyboard shortcuts surfaced visually. Targets for power users. Hidden on screens < 768 px (mobile companion has different shortcuts; see `MOBILE.md`).

---

## Charts drawer

Bottom-right corner button: `📊 Charts`. Opens a slide-up drawer with:

- **Hourly earnings** — line chart, last 24h
- **Task type breakdown** — donut, % of revenue by CARRY / SORT / NAVIGATE / INSPECT
- **Rejection-rate trend** — line chart, last 7 days, with reason breakdown overlay
- **Completion-time histogram** — bucketed by 30s, last 24h

Charts are NOT visible by default. They're for "Why is X happening?" diagnostics, not at-a-glance. Drawer state persists per-user.

---

## 2D fleet map (toggle)

A button at the top-right: `🗺 Map`. Opens a full-page modal with the warehouse satellite map showing:

- Geofence overlays (per policy)
- Robot positions (live, from MQTT heartbeat)
- Heatmap of recent rejections (where do failed offers originate?)
- Click on a robot → fleet drill-down

This is the operator's primary spatial debugging tool. Spec lives in `COMPONENTS/FLEET-MAP.md` (v1.5 — for v1, it's a placeholder that links to a static map service).

---

## When the dashboard goes quiet

Most operators check the dashboard at the start of their day, mid-day, and end of day. In between, they want to know if anything urgent is happening.

**Push notifications (opt-in):**
- New high-severity alert
- Robot offline > 5 min
- Dispute opened
- Daily withdraw cap reached

Delivered via:
- Browser notification (if tab open)
- Email (if address provided)
- Telegram bot (v1.5)

---

## What's NOT on the dashboard

- Per-job details — those live in `/dashboard/jobs/[id]`
- Per-robot health detail — `/dashboard/fleet/[robotId]`
- Settings — `/dashboard/settings`
- Earnings history beyond the headline — `/dashboard/earnings`
- Marketing copy or onboarding nudges — the dashboard is a tool, not a tour

If something here exceeds a glance, it goes on a different URL.

---

## Edge cases

- **Brand new operator with no data.** Empty-state hero: "Your robot is live. Once an agent posts a job, we'll show it here." With CTA "Test by posting a job from your agent surface."
- **Operator with all robots offline.** Red banner top: "All robots offline. Last heartbeat 1h 12m ago."
- **Stale indexer.** Yellow banner: "Live data may be 2 min behind. Reconnecting…"
- **Operator with zero-data day.** Yesterday section: "$0.00 — no offers received. Check your geofence."

---

## Mobile rendering

`/dashboard` collapses to single-column on screens < 1024 px:

```
1. Earnings overnight (tile 1)
2. Alerts (tile 3)
3. Incoming offers (tile 4)
4. Fleet at a glance (tile 2)
5. Active jobs (tile 5)
```

Charts drawer + map become full-screen overlays. Persistent action bar hides.

For phone-first triage, the Operator should use the mobile companion (`MOBILE.md`).

---

## Telemetry

```
dashboard.viewed                    (window_size_class)
dashboard.tile.clicked              (tile_name)
dashboard.alert.dismissed           (alert_id)
dashboard.offer.approved            (offer_id, time_to_decide_ms)
dashboard.offer.declined            (offer_id, reason?)
dashboard.sweep.initiated           (total_usdc)
dashboard.sweep.succeeded
dashboard.charts.opened
dashboard.map.opened
dashboard.shortcut.used             (key)
```

---

## Related

- `FLEET-OPS.md` — adjacent fleet controls
- `JOB-APPROVAL.md` — the offer approval modal in detail
- `SETTLEMENT-LEDGER.md` — where the "Sweep" CTA lands
- `MOBILE.md` — phone companion
- `IA.md` — sidebar structure
- `STATE-MACHINE.md` — what's behind the "phase" indicators
- `ERRORS.md` § U-01, U-02 — staleness handling
