# DISPUTE-CARD

> The failed-proof / open-dispute card. Surfaces in the Alerts panel for both Operators and Agents.

---

## Three variants

### A. Failed-proof alert (Operator view)

```
┌────────────────────────────────────────────────────────────────────┐
│  ✗ PROOF REJECTED                                                  │
│                                                                    │
│  JOB-7c2a · G1-ALPHA · CARRY · GPS_MISMATCH                        │
│  Δ 28 m beyond tolerance · 5 min ago                                │
│                                                                    │
│  Refund $9.00 → client · stake slashed −0.48 ROVA                  │
│                                                                    │
│  [ View proof ]   [ Acknowledge ]                                  │
└────────────────────────────────────────────────────────────────────┘
```

### B. Open dispute (Operator view)

```
┌────────────────────────────────────────────────────────────────────┐
│  🟠 DISPUTE OPENED                                                  │
│                                                                    │
│  JOB-7c2a · G1-ALPHA · CARRY (settled May 25 14:42)                │
│  Aboki-Restock-Bot disputed: DAMAGED_ON_ARRIVAL                    │
│                                                                    │
│  You have 23h 47m to publish sensor pre-image or lose by default.  │
│                                                                    │
│  Evidence uploaded by agent:                                       │
│    [ 📷 photo_damaged_goods.jpg ]                                   │
│                                                                    │
│  [ Publish pre-image ]   [ Concede dispute ]   [ View evidence ]   │
└────────────────────────────────────────────────────────────────────┘
```

### C. Dispute outcome (both views)

```
┌────────────────────────────────────────────────────────────────────┐
│  ✗ DISPUTE OVERTURNED                                              │
│                                                                    │
│  JOB-7c2a · DAMAGED_ON_ARRIVAL                                     │
│  Resolved May 27 09:18                                              │
│                                                                    │
│  $9.00 refunded to agent · −0.45 ROVA additional slash             │
│  Robot reputation: 4920 → 4870 (-50)                                │
│                                                                    │
│                                              [ View resolution ]  │
└────────────────────────────────────────────────────────────────────┘
```

---

## Props

```ts
interface DisputeCardProps {
  jobId: string;
  variant: "rejected-proof" | "dispute-open" | "dispute-resolved";
  details: {
    rejectReason?: "GPS_MISMATCH" | "SLA_BREACH" | "OTHER";
    disputeReason?: DisputeReason;
    evidence?: EvidenceItem[];
    deadline?: Date;
    outcome?: "UPHELD" | "OVERTURNED" | "INCONCLUSIVE";
    refund?: bigint;
    slash?: bigint;
    repDelta?: number;
  };
  onPublishPreImage?: () => void;
  onConcede?: () => void;
  onAcknowledge?: () => void;
}
```

---

## Behavior

- **"View proof"** → opens `PROOF-RECEIPT.md` in side panel (failing variant)
- **"Publish pre-image"** → modal with file picker; uploads + sends tx
- **"Concede dispute"** → confirm modal: "You give up; auto-OVERTURNED. -30 reputation. Are you sure?"
- **"Acknowledge"** → clears alert from active list (still in history)
- **Deadline countdown** → updates every minute; at 1h remaining, card border pulses

---

## States

| State                | Visual                                              |
| -------------------- | --------------------------------------------------- |
| New (< 5 min old)    | Subtle highlight                                    |
| Read but not acted   | Default                                             |
| Acknowledged         | Greyed; in history list                             |
| Action in progress   | Spinner on the action button                        |
| Resolved             | Outcome variant; no actions other than view         |

---

## Severity color

- Failed proof: `alert` (red)
- Open dispute: `wheat` / amber (warning)
- Dispute resolved: matches outcome (red if overturned, neutral if upheld)

---

## Accessibility

- Severity announced via `aria-live="assertive"` for new high-severity entries (operator should know about a dispute landing immediately)
- Deadline countdown announced at 1h, 30m thresholds
- Evidence images have alt text generated from the agent's "caption" field
- Concede confirmation requires keyboard `Enter` + `Tab` to focus the confirm button (no single-click)

---

## Where used

- `/dashboard` Alerts panel
- `/dashboard/jobs/[id]` (full surface for one dispute)
- `/agent/jobs/[id]` (agent view)
- Email notification body
- Mobile Alerts screen

---

## Related

- `DISPUTE-RESOLUTION.md` — protocol flow this card surfaces
- `AGENT-DISPUTE.md` — agent's path
- `COMPONENTS/PROOF-RECEIPT.md` — the receipt the card links to
- `ERRORS.md` § D
- `MOBILE.md` Screen 3 — Alerts on phone
