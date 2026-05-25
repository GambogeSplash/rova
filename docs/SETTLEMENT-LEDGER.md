# SETTLEMENT-LEDGER

> Every USDC in, out, and through. The Operator's accounting view of their fleet's revenue. The screen that converts "we're earning" into "here's exactly how much, where, and from whom."

---

## Audience

Operator. Needs:
- Net earnings by day / week / month
- Per-robot earnings + protocol fee breakdown
- Audit trail for tax / bookkeeping
- Treasury sweep visibility
- Slashing event history

---

## Entry point

`/dashboard/earnings`. Also reachable via "See all earnings →" link from the dashboard's earnings tile.

---

## Top stat strip

```
┌──────────────────────────────────────────────────────────────────────┐
│  This week              This month             All time              │
│  $1,247.83             $4,892.15              $14,302.41              │
│  47 jobs · 3 failed    188 jobs · 12 failed    612 jobs · 41 failed   │
│  +14.2% vs last week                                                  │
└──────────────────────────────────────────────────────────────────────┘
```

Toggles for window (week / month / all-time). Defaults to "this week" Sunday-Sunday.

---

## Ledger table

The body is a `SettlementRow` table. Each row is one settlement event from the chain:

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Date         Job         Robot       Type     Gross    Fee     Net     ⤺ │
│ ───────────────────────────────────────────────────────────────────────── │
│ May 25 03:24 #7c2a       G1-ALPHA    CARRY    $4.80   $0.014   $4.786  ↗  │
│ May 25 03:18 #7c29       G1-BETA     SORT     $3.20   $0.010   $3.190  ↗  │
│ May 25 03:11 #7c28       G1-ALPHA    CARRY    $5.10   $0.015   $5.085  ↗  │
│ May 25 03:04 #7c27       G2-OMEGA    CARRY    $7.50   $0.022   $7.478  ↗  │
│ May 25 02:51 #7c26       G1-GAMMA    SORT     $4.10   $0.012   $4.088  ↗  │
│  …                                                                        │
│                                                                           │
│ TOTAL    47 jobs · 3 failed                  $230.20  $0.69   $221.04     │
└───────────────────────────────────────────────────────────────────────────┘
```

Each row is clickable → opens `/job/[id]` in a new tab (public receipt viewer).

The arrow column (`⤺`) is the Basescan link.

### Filters

Above the table:

```
Date: [ Last 7 days ▾ ]   Robot: [ All ▾ ]   Type: [ All ▾ ]   Status: [ Settled ▾ ]
                                                                                    [Export CSV]
```

Date range, robot, task type, status (settled / failed / disputed / refunded). Combinations supported.

### Sorting

Default: most recent first. Toggle headers to sort by gross, net, or duration. Sort persists in URL (`?sort=net&order=desc`).

### Pagination

Cursor-based (see `INDEXER.md` § Pagination). Default 50 rows; "Load 50 more" button.

---

## Slashing log (separate panel)

Below the ledger table, a smaller "Slashes" panel:

```
┌────────────────────────────────────────────────────────────────────┐
│  SLASHING EVENTS                                                   │
│                                                                    │
│  May 24 18:42  G1-DELTA  Job #7b91  GPS_MISMATCH  -0.48 ROVA       │
│  May 23 09:14  G1-DELTA  Job #7a3e  SLA_BREACH    -0.81 ROVA       │
│  May 21 15:22  G2-OMEGA  Job #79bd  GPS_MISMATCH  -0.36 ROVA       │
│                                                                    │
│  Total this week: 3 events · 1.65 ROVA slashed (~$3 at current px) │
└────────────────────────────────────────────────────────────────────┘
```

Slashes are rare; surfacing them prominently helps the operator catch a robot that's repeatedly failing.

---

## Treasury sweep

A separate panel: "Robot wallet balances."

```
┌────────────────────────────────────────────────────────────────────┐
│  ROBOT WALLET BALANCES                            [ Sweep all ]    │
│                                                                    │
│  G1-ALPHA   0x71C7…4e2F   $48.21  USDC                              │
│  G1-BETA    0x83A2…91Da   $34.18  USDC                              │
│  G1-GAMMA   0xc4D9…6F12   $29.40  USDC                              │
│  G1-DELTA   0x4f0E…aE45   $0.00   USDC  (deactivated)              │
│  G2-OMEGA   0xb1D7…22cF   $52.94  USDC                              │
│                                                                    │
│  Total available to sweep: $164.73 USDC                            │
└────────────────────────────────────────────────────────────────────┘
```

"Sweep all" triggers a batched UserOp:
- Each robot wallet authorizes a transfer to the operator's treasury
- Single signature from the operator's root wallet
- Gas estimated and shown before signing

Per-row sweep is also possible (click the wallet address → individual sweep modal).

### Why not auto-sweep

We considered auto-sweeping (each settlement immediately sweeps to treasury). Rejected because:
- It doubles the gas cost per job
- The buffer in the robot wallet is what funds disputes (see `DISPUTE-RESOLUTION.md`)
- Operators want batching for tax + accounting reasons (one sweep = one record)

Default cadence is weekly sweep, configurable per operator.

---

## Per-robot earnings breakdown

Below the wallet balances:

```
┌────────────────────────────────────────────────────────────────────┐
│  EARNINGS BY ROBOT — LAST 7 DAYS                                   │
│                                                                    │
│  G1-ALPHA  ████████████████████  $387.21  (88 jobs)                │
│  G2-OMEGA  ███████████████        $312.40  (62 jobs)                │
│  G1-GAMMA  ███████████             $223.18  (51 jobs)                │
│  G1-BETA   █████████               $194.66  (44 jobs)                │
│  G1-DELTA  ██                      $43.12   (8 jobs, 2 failed)       │
│                                                                    │
│  Best earner: G1-ALPHA ($4.40 / job avg)                            │
│  Worst earner: G1-DELTA (high failure rate — investigate)           │
└────────────────────────────────────────────────────────────────────┘
```

Horizontal bar chart. Bars normalized to the highest earner. Tooltip on hover with detailed breakdown.

---

## Export

The CSV export includes every settlement + slash + sweep in the filter range. Format:

```csv
type,timestamp,job_id,robot,task_type,gross_usdc,fee_usdc,net_usdc,tx_hash,chain
settlement,2026-05-25T03:24:18Z,7c2a,G1-ALPHA,CARRY,4.80,0.014,4.786,0x...,base-sepolia
settlement,2026-05-25T03:18:42Z,7c29,G1-BETA,SORT,3.20,0.010,3.190,0x...,base-sepolia
slash,2026-05-24T18:42:11Z,7b91,G1-DELTA,GPS_MISMATCH,,,,,−0.48 ROVA,base-sepolia
sweep,2026-05-22T08:00:00Z,,,,,,,164.73,0x...,base-sepolia
```

Three event types (settlement, slash, sweep) interleaved with timestamps. The CSV is suitable for QuickBooks / Xero / hand-rolled bookkeeping.

---

## API surface

The same data backs an API endpoint for operators who want to ingest into their own systems:

```
GET /api/v1/operators/0xabc.../earnings?from=2026-05-18&to=2026-05-25
GET /api/v1/operators/0xabc.../slashes?from=...&to=...
GET /api/v1/operators/0xabc.../sweeps?from=...&to=...
```

Authenticated by SIWE session cookie or a long-lived API token (v1.5).

---

## Edge cases

- **Brand new operator, zero settlements** → empty state: "Your robots haven't earned yet. Once they complete jobs, they'll show here."
- **High failure rate cluster** → banner: "G1-DELTA has 3 failures in 7 days. Inspect the robot or adjust its policy."
- **Sweep fails mid-batch** → show which wallets succeeded, which failed; retry just the failures
- **Operator switches accounting period (Sun-Sat vs Mon-Sun)** → editable setting in `/dashboard/settings`
- **Indexer lag** → "Showing data through May 25 14:32. Latest 3 settlements may not yet appear."

---

## Telemetry

```
ledger.viewed                  (range, robot_filter?)
ledger.export.requested        (range, row_count)
ledger.row.opened              (jobId)
ledger.filter.applied          (field, value)
sweep.viewed
sweep.initiated                (wallet_count, total_usdc)
sweep.completed                (success_count, fail_count, elapsed_ms)
```

---

## Related

- `DASHBOARD.md` § Tile 1 — the dashboard summary points here
- `STATE-MACHINE.md` § COMPLETED → settlement — when these rows come into existence
- `DISPUTE-RESOLUTION.md` — what happens to past settlements that get disputed
- `BIZ/PRICING.md` — the 0.3% protocol fee these rows reflect
- `OPS/MONITORING.md` — alerts that fire from the slash event stream
