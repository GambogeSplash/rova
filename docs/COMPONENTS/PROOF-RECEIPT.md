# PROOF-RECEIPT

> The visual display of a single proof — passing and failing variants. The component that turns a 4-field tuple into something a human can read.

---

## Two variants

### Passing variant (verified)

```
┌────────────────────────────────────────────────────────────────────┐
│  ✓ PROOF VERIFIED                                                  │
│                                                                    │
│  Job              JOB-7c2a                                         │
│  Submitted at     2026-05-25T14:42:01Z                             │
│  Block            14892034                                         │
│  Tx hash          0x4d1f…e8c3                                       │
│                                                                    │
│  ───── PROOF CONTENTS ───────────────────────────────────────────  │
│                                                                    │
│  GPS              52.4137°, -1.5108°                               │
│  Destination       52.4137°, -1.5108°  (Δ 0.0001° / ~12 m)         │
│  Tolerance         1000 E7 (~10 m)                                  │
│  GPS check         ✓ within tolerance                                │
│                                                                    │
│  Submitted at     2026-05-25T14:42:01Z                             │
│  Deadline          2026-05-25T14:47:00Z                             │
│  SLA check         ✓ within window (2:59 ahead of deadline)         │
│                                                                    │
│  Sensor hash      0x7f3e8d2c…91ab (45 KB pre-image)                 │
│                                                                    │
│  ───── SETTLEMENT ─────────────────────────────────────────────── │
│                                                                    │
│  Robot payout     $4.786 USDC      → 0x71C7…4e2F                   │
│  Protocol fee     $0.014 USDC                                       │
│  Refund to client $0.500 USDC      → 0xa7c1…da93                   │
│                                                                    │
│                                          [ View on Basescan ↗ ]   │
└────────────────────────────────────────────────────────────────────┘
```

### Failing variant (rejected)

```
┌────────────────────────────────────────────────────────────────────┐
│  ✗ PROOF REJECTED · GPS_MISMATCH                                    │
│                                                                    │
│  Job              JOB-7c2a                                         │
│  Submitted at     2026-05-25T14:42:01Z                             │
│  Block            14892034                                         │
│                                                                    │
│  ───── PROOF CONTENTS ───────────────────────────────────────────  │
│                                                                    │
│  GPS              52.4140°, -1.5101°                               │
│  Destination       52.4137°, -1.5108°  (Δ 0.0003° / ~28 m)         │
│  Tolerance         1000 E7 (~10 m)                                  │
│  GPS check         ✗ Δ 28 m exceeds tolerance                       │
│                                                                    │
│  Submitted at     2026-05-25T14:42:01Z                             │
│  Deadline          2026-05-25T14:47:00Z                             │
│  SLA check         ✓ within window                                  │
│                                                                    │
│  Sensor hash      0x7f3e8d2c…91ab                                   │
│                                                                    │
│  ───── OUTCOME ─────────────────────────────────────────────────── │
│                                                                    │
│  Refund to client $9.00 USDC       → 0xa7c1…da93 (full bounty)     │
│  Robot stake slash −0.48 ROVA                                       │
│                                                                    │
│                                          [ View on Basescan ↗ ]   │
└────────────────────────────────────────────────────────────────────┘
```

The difference: badge color (green vs red), the failing check is highlighted, the outcome section flips from "robot payout" to "refund + slash."

---

## Props

```ts
interface ProofReceiptProps {
  jobId: string;
  proof: Proof;
  destination: [number, number];
  tolerance: number;             // E7 units
  deadline: Date;
  outcome: "verified" | "rejected";
  rejectReason?: "GPS_MISMATCH" | "SLA_BREACH";
  settlement?: Settlement;
  slash?: Slash;
  variant?: "full" | "compact";
  showRawData?: boolean;
}
```

---

## Behavior

- **Verified** badge animates in (motion A entrance)
- **Rejected** badge is static red — no celebration
- Each check row has a tooltip on the ✓ or ✗ symbol explaining what was checked
- "View raw data" toggle reveals the on-chain event in JSON

---

## Variants

### `full` (default)
The two big variants above. Used in `/job/[id]` and the dashboard's job detail.

### `compact`
Just the badge + outcome amount. Used in lists and tooltips.

```
✓ Verified · $4.786 paid
```

---

## Accessibility

- ✓ / ✗ symbols paired with text ("VERIFIED" / "REJECTED")
- Color is supplemental — color-blind users see the same outcome
- Tabular data uses `<table>` with proper headers
- All addresses are click-to-copy with a screen reader announcement

---

## Where used

- `/job/[id]` — public receipt
- `/dashboard/jobs/[id]` — operator view
- `/agent/jobs/[id]` — agent view
- Simulator after `settled` phase
- Email receipt (`COPY/EMAIL-RECEIPT.md`)

---

## Related

- `PROOF.md` — what's actually being shown
- `STATE-MACHINE.md` — when this component renders
- `ERRORS.md` § P — failure variants
- `BIZ/PRICING.md` — the protocol fee shown
