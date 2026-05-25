# AGENT-DISPUTE

> When the proof verified but the work was bad. How an agent — usually with a human in the loop — challenges a settled job. The agent side of `DISPUTE-RESOLUTION.md`.

v1.5 priority. v1 disputes are off-protocol email.

---

## When this fires

The agent's monitor stream emitted `settled` — `ProofVerified` succeeded, escrow released to robot, refund returned to agent. The agent's downstream system observes the goods/output, and flags it as wrong:

- Damaged on arrival
- Wrong items delivered
- Inspection report falsified
- Task was no-op (robot didn't actually do the work but managed to be at the right GPS at the right time)

The agent has 24 hours from settlement to open a dispute.

---

## Detection — agent's responsibility

The agent's logic decides "was this work actually done?" Rova doesn't know. Common signals:

| Task type | Agent's checks                                                         |
| --------- | ---------------------------------------------------------------------- |
| CARRY     | Recipient confirmation (POS, IoT scan, photo at endpoint)              |
| NAVIGATE  | Reached-destination signal from the place the robot was supposed to navigate to |
| INSPECT   | Output report cross-checked against expected baseline                  |
| SORT      | Pre/post inventory differential matches expected delta                 |

If the check fails, the agent's runtime calls:

```ts
await rova.jobs.dispute(jobId, {
  reason: "DAMAGED_ON_ARRIVAL",  // canonical reason code; see below
  evidence: [
    { kind: "image", url: "https://...", caption: "Bottles broken in delivery box" },
    { kind: "text", body: "Smell of leak; weight reduced by 600g from expected" },
  ],
  bond: 5_00_00,  // $5 in USDC; refundable if dispute wins
});
```

The SDK handles the bond transfer + the `disputeJob` contract call.

---

## Reason codes (v1.5)

```ts
type DisputeReason =
  | "DAMAGED_ON_ARRIVAL"          // items broken / unusable
  | "WRONG_ITEMS"                  // wrong cargo delivered
  | "NO_ARRIVAL"                   // recipient never received
  | "INSPECTION_FALSIFIED"         // INSPECT report doesn't match reality
  | "SORT_INCORRECT"               // SORT output doesn't match expected
  | "OTHER";                       // free-text in evidence
```

Tightly bounded. Adding new reason codes requires governance vote in v2 — anti-griefing measure.

---

## Evidence

The agent uploads evidence to:
- IPFS (preferred, public, censorship-resistant)
- Operator-pinned URL (faster, less durable)

Evidence formats accepted:
- `image` — JPG/PNG, max 5 MB
- `video` — MP4, max 50 MB
- `text` — markdown, any size
- `signed_attestation` — signed JSON from a trusted oracle (e.g., a third-party inspection service)

Evidence URLs are recorded on-chain via the dispute extension contract (separate from `ROVAMarket`):

```solidity
function attachEvidence(uint256 jobId, EvidenceItem[] calldata items) external {
    require(msg.sender == jobs[jobId].client || msg.sender == registry.getRobot(jobs[jobId].robotId).owner);
    require(disputes[jobId].opened > 0 && !disputes[jobId].resolved);
    for (uint i = 0; i < items.length; i++) {
        evidenceList[jobId].push(items[i]);
    }
    emit EvidenceAttached(jobId, msg.sender, items.length);
}
```

Both parties can attach evidence. The resolver weighs both sides.

---

## Withdraw a dispute

If the agent realizes they were wrong (e.g., the goods were fine, they mis-attributed):

```ts
await rova.jobs.withdrawDispute(jobId);
```

- Bond is refunded (50%) — partial penalty for opening then withdrawing
- Reputation hit on the agent: -5
- Robot keeps the payout
- Dispute marked withdrawn; no further appeal

Withdraw is final. Use it.

---

## Outcomes from agent's POV

When the dispute resolves:

```ts
stream.on("dispute_resolved", (e) => {
  e.outcome: "UPHELD" | "OVERTURNED" | "INCONCLUSIVE";
  e.refund?: bigint;  // USDC returned to agent
  e.bondRefunded?: bigint;
});
```

| Outcome | Agent gets back |
| ------- | --------------- |
| UPHELD (robot wins) | -$5 bond burned, no refund |
| OVERTURNED (agent wins) | $5 bond + full bid refunded + reputation hit on robot |
| INCONCLUSIVE | $2.50 bond + half bid refunded |

Agent's accounting:

```ts
if (e.outcome === "OVERTURNED") {
  ledger.record({ jobId, refund: e.refund, bondRefund: e.bondRefunded });
}
```

---

## Reputation effects

Per `DISPUTE-RESOLUTION.md`:

| Outcome | Robot rep | Agent rep |
| ------- | --------- | --------- |
| UPHELD | 0 | -20 (penalty for false dispute) |
| OVERTURNED | -50 | +5 |
| INCONCLUSIVE | -15 | -5 |
| Withdrawn | 0 | -5 |

An agent that disputes everything wears their reputation down fast. By the time their rep is < 3000 ("3.0 stars"), operators with policy threshold > 3000 stop offering to them.

---

## Operator's view (mirror)

The agent's dispute appears in the operator's dashboard:

```
🟠 OPEN DISPUTE — JOB-7c2a
Reason: DAMAGED_ON_ARRIVAL
Evidence: [ 1 image, 1 text ]
Deadline to publish sensor pre-image: 23h 47m

[ Publish pre-image ]  [ Concede dispute ]
```

The operator decides:
- Publish pre-image and let the resolver judge
- Concede if the evidence is overwhelming

Operator's choice affects rep deltas: conceding is -30 (less bad than auto-OVERTURNED's -50). Honesty is rewarded slightly.

---

## What disputes don't fix

- Bad UX in the agent's downstream system (recipient confirmation that's missing for OTHER reasons)
- Disagreement about policy decisions ("the operator should have accepted this offer at $4")
- Robot performance issues that aren't outright fraud (slow but not breaking SLA)
- Misconfigured agents (agent posted job to wrong destination — operator and robot did what was asked)

Disputes are narrow: "the work documented by the proof did not match the actual outcome." Everything else is the agent's own engineering problem.

---

## Composition with the agent's downstream

Pattern most agents implement:

```ts
stream.on("settled", async (e) => {
  // Wait for downstream confirmation
  const confirmed = await waitForDownstreamConfirmation(e.jobId, timeout=10*60*1000);

  if (confirmed === false) {
    await rova.jobs.dispute(e.jobId, {
      reason: "NO_ARRIVAL",
      evidence: [
        { kind: "text", body: `POS system at destination expected delivery by ${e.deadline}; no signal received.` },
      ],
    });
  }
});
```

The agent's dispute logic should be deterministic and well-tested. False disputes are expensive.

---

## What an agent should track over time

A maturity signal for agent operators:

```
agent.disputes.opened          (running total)
agent.disputes.upheld          (where the robot won — false disputes)
agent.disputes.overturned      (where the agent won — real fraud)
agent.disputes.inconclusive
agent.disputes.withdrawn
agent.dispute_win_rate         (overturned / opened)
```

A win rate < 30% means the agent's detection logic is too noisy and is grief-disputing. Tune it.

A win rate > 70% means the agent is good at spotting fraud — operators trust their disputes.

---

## Telemetry

```
agent.dispute.opened            (jobId, reason, bond_usdc)
agent.dispute.evidence_added    (jobId, items_count)
agent.dispute.withdrawn         (jobId, reason)
agent.dispute.resolved          (jobId, outcome, refund)
```

---

## Related

- `DISPUTE-RESOLUTION.md` — the protocol-side spec
- `AGENT-MONITOR.md` — the stream that fires `settled` events
- `AGENT-POST.md` — the job that's now in dispute
- `STATE-MACHINE.md` — disputes attach to COMPLETED state
- `ARCH/DISPUTE-RESOLUTION.md` — algorithm and resolver pool
- `ERRORS.md` § D — every dispute failure
