# JOB-APPROVAL

> The Operator's manual-approve path. When `autoAccept: false` on the robot's policy, every incoming offer surfaces as an approval card. This is the screen they look at most after the dashboard tiles.

---

## Frame

Two reasons an offer surfaces for approval:

1. **Policy says so.** Operator set `autoAccept: false` (typical for the first 1-2 weeks of a new fleet — trust-building period).
2. **Anomaly flagged.** Auto-accept is on, but the SDK flagged this offer as suspicious — e.g., bounty 3× normal, client wallet < 24h old, client reputation low but bounty above floor.

In both cases the SDK holds the offer (publishes `OfferingHeld`) and waits up to `(sla_minutes × 0.5)` for human action. Past that window: auto-decline + log.

---

## Surface

Approval cards appear in `/dashboard` Tile 4 ("Incoming offers"). They are NOT modals — they live inline so the Operator can see context (active jobs, fleet status) while deciding.

Each card:

```
┌────────────────────────────────────────────────────────────────────┐
│  $7.50 CARRY · 12 min SLA                              [ Approve ] │
│  Aboki-Restock-Bot (rep 4.87 · 14 prior jobs)          [ Decline ] │
│  G1-BETA · Rack A2 → Dispatch Bay 1                                │
│                                                                    │
│  Bounty $7.50 · Robot ask $4.80 · Net to you $4.66                 │
│  Distance 18 m · Estimated completion 5m 24s                       │
│  Time to decide: 4:18 ⏱                                            │
│                                       [ ▾ More detail ]            │
└────────────────────────────────────────────────────────────────────┘
```

### Required fields (per row)

- Bounty + task type + SLA
- Client identity (name if recognized, address truncated otherwise) + reputation + count of prior jobs
- Which robot would take it + pickup → dropoff (with named places if recognized)
- Economics breakdown
- Distance + estimated completion time
- Time-to-decide countdown (visible — pressure is the design intent)
- "More detail" expand for the long form

### Expanded view

Click "More detail" reveals:

- Client's full wallet address + Basescan link
- Client's last 5 jobs with this operator (date, robot, outcome)
- Client's risk score (a derived signal: rep, balance, age, recent disputes)
- Why this offer passed the auto-filter but still requires approval (e.g., "Bounty 2.4× median for this task type — flagged for review")
- "Mute future flags from this client" toggle (creates a soft-allowlist entry)

---

## Approve mechanics

Click "Approve":

1. Local UI marks the card as accepting + spinner
2. SDK releases the `OfferingHeld` (clears it locally)
3. Agent's matcher sees the offering as free again, calls `assignRobot(jobId, offeringId)`
4. `JobAssigned` fires; robot starts executing
5. Card slides up out of the list; appears in Tile 5 (Active jobs)

Wait — race condition. Between step 3 and step 4, what if another agent picks the offering first? The Operator's approval doesn't bind the offering to *this* agent — it just releases the SDK's local hold. In practice this is rare; the SDK keeps the hold until a window has passed AFTER approval to let *the original posting agent* re-match.

### Soft-binding (default behavior)

The SDK's hold is parameterized: "Hold for agent X for up to N seconds after approval." This gives the original agent right-of-first-refusal. Other agents see the offering as available only after the soft-bind expires.

This is off-protocol behavior — purely SDK side. Tampering with it doesn't break anything; it just means the offering is fair game to all agents immediately after approval.

---

## Decline mechanics

Click "Decline":

1. SDK explicitly rejects the offer (deactivates the held bind)
2. Logs `PolicyRejected(jobId, "OPERATOR_DECLINE")` to the operator's audit log
3. Card animates out
4. Optionally, dialog: "Decline reason (optional)" with quick-pick chips:
   - Low reputation
   - Suspicious bounty
   - Wrong destination
   - Other (free text)

The decline reason is logged for the operator's own analytics later. It doesn't propagate to the agent (who just sees their offering wasn't picked up).

---

## Time pressure

The countdown is visible because:
- Agents have moved on if approval is too slow
- An approval-after-expiry is a refund + a missed opportunity for everyone
- The Operator's risk surface is bounded by the SLA window

At 30 seconds remaining, the card turns yellow with a pulse animation.
At 0 remaining, it auto-declines and slides out.

---

## Bulk approve

For operators reviewing many offers (e.g., night-shift surge):

```
┌────────────────────────────────────────────────────────────────────┐
│  [ ☑ ] Select all                                                  │
│  [☑] $7.50 CARRY · Aboki-Restock-Bot                                │
│  [☑] $5.10 SORT · Tetris-Agent                                      │
│  [ ] $12.40 CARRY · Unknown-Client (rep 2.81 ⚠)                    │
│  [☑] $4.90 CARRY · Aboki-Restock-Bot                                │
│                                                                    │
│  3 selected   [ Approve all 3 ]   [ Decline 1 unselected ]         │
└────────────────────────────────────────────────────────────────────┘
```

Bulk approve dispatches in parallel (no batch contract call needed — each is independent). Bulk decline is cheaper (just SDK-side, no chain tx).

---

## Edge cases

- **Card disappears mid-decision.** Offer expired or was assigned to another robot. Toast: "Offer no longer available." Refresh.
- **Operator approves but agent never assigns.** Soft-bind expires; offering becomes generally available; logged for the operator.
- **All cards expire while operator is away.** Email summary: "12 offers expired in the last 30 min while you were away. [ See in dashboard ]" Helps operator decide to flip auto-accept on.
- **Operator approves more than max-concurrent.** Card 2 shows warning: "G1-BETA already at max concurrent (1). Approving this will hold the offer until BETA frees up." Or, operator can pick a different robot.

---

## Why this exists (and isn't just auto-accept)

There's a temptation to skip this surface entirely — "just turn auto-accept on, that's the point of an autonomous protocol."

The answer is: autonomy is earned. New operators need to see what the marketplace looks like *before* they trust the filter. Manual approval for the first 50-100 offers builds the operator's mental model of:
- What bounties look like in their market
- Who keeps coming back
- What feels "off" (often: very-new wallets posting suspiciously high bounties)

After that calibration, they flip auto-accept on and the queue becomes invisible to them.

---

## Telemetry

```
approval.surfaced              (offerId, reason: policy | flag, time_remaining_s)
approval.expanded              (offerId)
approval.decided               (offerId, action: approve | decline, reason_chip?, time_to_decide_ms)
approval.bulk_approved         (count)
approval.bulk_declined         (count)
approval.expired               (offerId, was_visible: bool)
approval.muted_client          (clientAddress)
```

Operators can see their own approval-rate trend: "You approved 78% of flagged offers this week. The most common decline reason was Low reputation."

---

## Related

- `POLICIES.md` § autoAccept — the toggle that creates this surface
- `DASHBOARD.md` § Tile 4 — where these cards live
- `JOB-APPROVAL.md` (you are here) — this doc
- `STATE-MACHINE.md` § OPEN → OPEN — what the SDK is doing between offer and approval
- `AGENT-POST.md` § Phase 3 — the agent's view of the race condition
- `ERRORS.md` § C-03 — race conditions where the offer disappears
