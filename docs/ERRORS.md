# ERRORS

> Every failure mode in Rova, what it looks like, what the user sees, and what to do. The catalog every UI surface implements.

If a state isn't named here, it shouldn't exist in the product. New failure modes go in this doc first, then in the code.

---

## Frame

Three rules for how Rova handles errors:

1. **Every error has a typed reason.** Not "something went wrong." A discriminated kind, a structured payload, a recovery path.
2. **The cause and the recovery are both shown.** "Robot disconnect" + "We're polling for heartbeat. If it doesn't return in 60s, the job will SLA-breach and your bounty refunds." Not just "Something failed."
3. **Failures degrade gracefully.** A failed indexer query falls back to direct RPC. A failed robot heartbeat shows last-known state with a staleness indicator. A failed proof submission queues for retry. We never blank-screen.

---

## Error catalog

Organized by where the error originates. Each entry: trigger, surface text, recovery, escalation.

---

### Wallet errors

#### W-01 — Wallet not connected
- **Trigger:** User on an authenticated surface without an active SIWE session
- **Surface:** Inline empty state with "Connect wallet to continue" CTA
- **Recovery:** Click CTA → wallet flow → SIWE signature → resume
- **Escalation:** None — this is normal entry to the product

#### W-02 — Wallet on wrong chain
- **Trigger:** User connected to Mainnet but Rova is on Base Sepolia
- **Surface:** Top banner: "Switch to Base Sepolia to interact with Rova." + "Switch network" CTA
- **Recovery:** CTA triggers wallet network switch
- **Escalation:** If wallet doesn't support programmatic switch (rare), show manual instructions

#### W-03 — Signature rejected
- **Trigger:** User cancels signature prompt in wallet
- **Surface:** Toast: "Sign-in cancelled. Try again to continue."
- **Recovery:** User clicks Connect again
- **Escalation:** None

#### W-04 — Insufficient balance for gas
- **Trigger:** Wallet has < estimated gas
- **Surface:** Modal: "Need ~0.001 ETH for gas. Top up your wallet to continue." + link to Base faucet (testnet) or onramp (mainnet)
- **Recovery:** User funds wallet, retries action
- **Escalation:** None

#### W-05 — Insufficient USDC for bounty
- **Trigger:** Agent tries to `postJob` with bounty > agent wallet's USDC balance
- **Surface:** Modal: "Your wallet has $X.XX USDC. This job needs $Y.YY. Add funds or post a smaller bounty."
- **Recovery:** Add funds OR reduce bounty
- **Escalation:** None

---

### Contract errors (on-chain reverts)

#### C-01 — `NotClient`
- **Trigger:** Someone other than the job's client tries to assign or cancel
- **Surface:** "This job isn't yours to control." + back to listing
- **Recovery:** User navigates away. Should rarely happen — UI shouldn't expose actions for jobs the user doesn't own
- **Escalation:** If repeated, indicates a UI bug; log to Sentry

#### C-02 — `JobNotOpen`
- **Trigger:** Trying to assign or cancel a job that's no longer OPEN (race condition: someone else just assigned)
- **Surface:** Toast: "This job was just claimed. The view will refresh."
- **Recovery:** Auto-refresh page; user picks a different offering
- **Escalation:** None

#### C-03 — `InvalidOffering`
- **Trigger:** Offering was deactivated between browse and assign
- **Surface:** Toast: "That robot just went offline. Showing fresh offerings."
- **Recovery:** Refresh; user picks again
- **Escalation:** None

#### C-04 — `InsufficientBounty`
- **Trigger:** Robot raised its price between agent's browse and assign
- **Surface:** Modal: "Robot's price rose from $X to $Y. Increase bounty or pick another."
- **Recovery:** Re-post with higher bounty OR pick alternate offering
- **Escalation:** None

#### C-05 — `RobotNotActive`
- **Trigger:** Robot was deactivated between browse and assign
- **Surface:** Toast: "That robot just deactivated. Re-evaluating offerings."
- **Recovery:** Auto-refresh; agent matcher picks alternate
- **Escalation:** None

#### C-06 — `VerificationPending`
- **Trigger:** `settleJob` called before proof submitted or verified
- **Surface:** Toast: "Proof hasn't landed yet. We'll settle automatically when it does."
- **Recovery:** Subscribe to ProofVerified event; auto-call settleJob
- **Escalation:** If proof never lands within deadline + 2 min, fall to `J-04` SLA breach path

#### C-07 — `SLANotBreached`
- **Trigger:** `forceFailJob` called before the deadline
- **Surface:** Toast: "Job isn't past deadline yet. It auto-fails at HH:MM:SS."
- **Recovery:** Wait for deadline; can also be triggered by a keeper bot
- **Escalation:** None

---

### Proof errors (verifier rejections)

#### P-01 — GPS mismatch
- **Trigger:** `ProofRejected(jobId, "GPS_MISMATCH")` — proof coords outside `gpsTolerance` of destination
- **Surface (agent view):** Job page shows: "Proof rejected — robot wasn't at destination (∆ 23 m). Bounty refunded. Robot stake slashed −10%."
- **Surface (robot view):** "Last proof rejected for GPS_MISMATCH. Check RTK lock and try again on next job."
- **Recovery:** Agent gets refund automatically on `settleJob`. Robot operator triages.
- **Escalation:** Multiple GPS_MISMATCH within 24h on one robot → operator alert "robot may have GNSS issues"

#### P-02 — SLA breach (verifier path)
- **Trigger:** `ProofRejected(jobId, "SLA_BREACH")` — proof submitted but `timestamp > deadline`
- **Surface (agent view):** "Robot finished late (5m 18s vs 5m SLA). Bounty refunded. Robot stake slashed."
- **Surface (robot view):** "Last proof rejected — late. Tighten your route planner or extend the SLA in your offering."
- **Recovery:** Same as P-01
- **Escalation:** Repeated SLA_BREACH on one robot → operator review

#### P-03 — Already submitted
- **Trigger:** Robot tries to `submitProof` twice for the same job
- **Surface (robot view):** "Proof already submitted for this job. Result: VERIFIED / REJECTED"
- **Recovery:** Robot SDK reads chain state, syncs
- **Escalation:** Indicates SDK bug; log

#### P-04 — Job not configured
- **Trigger:** `submitProof` called for a job that isn't ASSIGNED (race condition or wrong robot)
- **Surface (robot view):** "No active assignment for this job. SDK will re-sync state."
- **Recovery:** SDK reads `jobs(jobId)`; if cancelled or already settled, marks complete; if `OPEN`, ignores
- **Escalation:** If repeated, SDK bug

---

### SLA / deadline errors

#### J-01 — Robot disconnect (heartbeat lost)
- **Trigger:** Robot's MQTT heartbeat hasn't pinged for > 30 seconds during an active job
- **Surface (operator view):** Yellow status pill on the robot tile: "Heartbeat lost (47s ago)". On the job: "Robot offline — recovering"
- **Recovery:** Wait. SDK retries connection. If recovers in < 60s, no UI change beyond the warning.
- **Escalation:** > 60s offline during active job → red banner + "Cancel job to refund bounty?" CTA. Auto-`forceFailJob` at deadline.

#### J-02 — Battery critical
- **Trigger:** Robot heartbeat shows battery < 15% during active job
- **Surface:** Yellow status: "Low battery (12%) — may not complete"
- **Recovery:** SDK should abort to charge; depends on robot's local logic
- **Escalation:** If robot completes despite low battery, no action. If fails for battery, route through P-01/P-02 path.

#### J-03 — GPS jam (off-protocol)
- **Trigger:** Robot heartbeat shows GPS dropouts during active job (SDK detection — multiple consecutive zero readings)
- **Surface (operator view):** Red status: "GPS signal degraded — proof may be rejected"
- **Recovery:** Robot SDK should pause until lock restored
- **Escalation:** If proof fires anyway and gets rejected, P-01 path. If robot pauses long enough for deadline → SLA breach path.

#### J-04 — SLA breach (no proof at deadline)
- **Trigger:** Job deadline passed, no proof submitted, no force-fail called
- **Surface (agent view):** "Job past deadline. Click to force-fail and refund bounty." Auto-clicks after 60s.
- **Surface (operator view):** "Robot missed SLA. Stake will be slashed."
- **Recovery:** `forceFailJob` — bounty refunds, stake slashed 10% of bid
- **Escalation:** Repeated SLA breaches by one robot → reputation drops below operator policy threshold → robot stops getting offers

---

### Settlement errors

#### S-01 — Escrow stuck
- **Trigger:** Proof verified, but `settleJob` is never called (no keeper bot, no agent action)
- **Surface (agent view):** "Funds released to escrow. Click Settle to disburse." Auto-settle is the default; this CTA only shows if auto-settle is off.
- **Surface (operator view):** "Job verified, awaiting settlement. Click Force settle to disburse."
- **Recovery:** Either party calls `settleJob`. The contract method is permissionless.
- **Escalation:** Indexer alert if a job is stuck in `verified-not-settled` > 5 minutes — Rova protocol may step in (keeper bot) for v1.5+

#### S-02 — Settlement gas spike
- **Trigger:** Network congested, gas price > 10× normal
- **Surface:** Banner on dashboard: "Network congested — settlements may be delayed."
- **Recovery:** Wait. Auto-settle retries with backoff. Manual settle works (user pays more gas).
- **Escalation:** None protocol-level

#### S-03 — Bundler rejected UserOp
- **Trigger:** ERC-4337 bundler rejects the robot's settlement UserOp (paymaster out of funds, malformed UserOp, etc.)
- **Surface:** "Settlement queued — paymaster issue. Falling back to direct settlement."
- **Recovery:** Fall back to non-sponsored path; user pays gas
- **Escalation:** Operator should top up paymaster

---

### Indexer errors

#### I-01 — Indexer lag
- **Trigger:** Indexer is > 30s / 10 blocks behind chain tip
- **Surface (subtle):** Small yellow dot next to the timestamp on lists. Tooltip: "Data may be ~Ns stale."
- **Recovery:** Indexer self-recovers. UI reads continue.
- **Escalation:** > 5 min lag → protocol alert (PagerDuty / Slack)

#### I-02 — Indexer unreachable
- **Trigger:** Indexer API returns 503 or times out
- **Surface:** Top banner: "Live data unavailable. Showing last known state."
- **Recovery:** UI falls back to direct RPC reads (slower, partial data). Retry indexer in background.
- **Escalation:** > 30s of unavailability → on-call paged

#### I-03 — Reorg detected
- **Trigger:** Indexer detected chain reorg
- **Surface:** No user-visible (reorgs are normal on L2s). Internal log.
- **Recovery:** Indexer drops shadow buffer, replays. UI's pending events un-render if affected.
- **Escalation:** Reorg deeper than 12 blocks → alert

---

### Policy errors (off-protocol, SDK-side)

#### Po-01 — Policy version mismatch
- **Trigger:** SDK loads a policy with `version` it doesn't support
- **Surface (operator view):** "Policy uses Rova v2 features. Upgrade SDK to load."
- **Recovery:** Operator upgrades SDK; OR rolls back to a v1 policy
- **Escalation:** Robot is `emergencyPaused`-equivalent until resolved

#### Po-02 — Policy syntactically invalid
- **Trigger:** Policy JSON malformed (missing required field, wrong type)
- **Surface (editor):** Inline red highlight at the broken field + "Field `priceFloors.CARRY` must be a number"
- **Recovery:** Fix in editor; can't save until valid
- **Escalation:** None

#### Po-03 — Geofence malformed (min > max)
- **Trigger:** Operator drew/typed geofence bounds where `lat.min > lat.max`
- **Surface (editor):** Warning on save: "Geofence bounds inverted — will reject all offers."
- **Recovery:** Fix bounds in editor
- **Escalation:** If saved, robot effectively `emergencyPaused`

#### Po-04 — Stale policy on a running robot
- **Trigger:** SDK detects local policy hasn't synced with operator's dashboard for > 24h
- **Surface (operator view):** Yellow status: "G1-ALPHA policy out of sync (synced 26h ago)"
- **Recovery:** SDK pulls; if local override conflicts, operator chooses which wins
- **Escalation:** > 7d stale = robot deactivates until sync

---

### Dispute errors (v1.5)

#### D-01 — Dispute window expired
- **Trigger:** Agent tries to open dispute > 24h after settlement
- **Surface:** "Dispute window closed (settled 26h ago). Contact support if you believe this was fraud."
- **Recovery:** Off-protocol — email Rova ops with the job ID
- **Escalation:** Internal triage; no on-chain recourse

#### D-02 — Sensor pre-image lost
- **Trigger:** Robot is required to publish pre-image, but its 90-day local retention expired
- **Surface (operator view):** "Sensor data for JOB-X.X.X expired (>90d). Cannot defend dispute."
- **Recovery:** Auto-rules in robot's favor IF chain shows healthy stats. Otherwise auto-rules in agent's favor.
- **Escalation:** Highlights why long-retention storage matters; OPS/INCIDENT may follow

#### D-03 — Sensor pre-image doesn't match hash
- **Trigger:** Robot publishes pre-image; hash doesn't match recorded `sensorHash`
- **Surface (everyone):** "Robot's published sensor data doesn't match recorded hash. Robot has admitted to lying."
- **Recovery:** Automatic 50% slash + full client refund
- **Escalation:** Robot's reputation tanked; operator reviews

---

### UI-only errors

#### U-01 — Stale tab
- **Trigger:** Browser tab open > 1 hour, last live event > 30 min ago
- **Surface:** Pulsing dot in nav: "Tab paused — click to resume live updates"
- **Recovery:** Click → re-subscribe to SSE streams
- **Escalation:** None

#### U-02 — Background WebSocket dropped
- **Trigger:** SSE stream silently disconnected (mobile sleep, network blip)
- **Surface:** Tiny `●` indicator on bottom-right toggles from green to yellow
- **Recovery:** Auto-reconnect with exponential backoff
- **Escalation:** After 5 failed reconnects, banner: "Reconnect manually"

#### U-03 — Component-level crash
- **Trigger:** React component throws during render
- **Surface:** Error boundary fallback — minimal "Something broke. Reload, or report." + reload button + report-bug link
- **Recovery:** Reload page
- **Escalation:** Sentry captures stack trace

---

## Conventions

### Error IDs

Each error is prefixed with a single letter indicating origin (W = wallet, C = contract, P = proof, J = job lifecycle, S = settlement, I = indexer, Po = policy, D = dispute, U = UI) and a sequence number. New IDs append, never reuse.

### User-facing copy

All error messages live in `src/lib/errorMessages.ts` keyed by ID:

```typescript
export const ERROR_MESSAGES = {
  "C-04": {
    title: "Robot raised its price",
    body: "Robot's price rose from {oldPrice} to {newPrice}. Increase bounty or pick another.",
    cta: "Pick another robot",
  },
  // ...
};
```

This keeps copy reviewable in one place (`COPY/MICROCOPY.md`).

### Logging

Every error gets a structured log entry:

```json
{
  "ts": "...",
  "level": "warn",
  "errorId": "C-04",
  "context": { "jobId": "4127", "oldPrice": "8.50", "newPrice": "9.00" },
  "user": { "address": "0xabc...", "role": "agent" }
}
```

Sentry tag = errorId. Operator can filter by error class.

---

## Related

- `STATE-MACHINE.md` — most lifecycle errors map back to a transition guard
- `PROOF.md` — the proof-side error catalog
- `POLICIES.md` — the policy-side reject reasons
- `OPS/MONITORING.md` — which errors page on-call
- `OPS/INCIDENT.md` — playbooks for the high-severity entries
- `COPY/MICROCOPY.md` — final wording for every surface
