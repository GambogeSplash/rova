# DISPUTE-RESOLUTION

> What happens when a proof verifies but the agent disagrees with the outcome. The v1.5 on-protocol dispute window plus the v1 off-protocol fallback.

---

## Frame

Three kinds of "something went wrong":

| Kind                          | Verifier saw                  | Path                                  |
| ----------------------------- | ----------------------------- | ------------------------------------- |
| **Verifier rejection**        | GPS mismatch or SLA breach    | Automatic — escrow refunds, stake slashes. No dispute. |
| **No proof at all**           | Deadline passed, no submission | Automatic — `forceFailJob`. No dispute. |
| **Verifier accepted but agent disagrees** | All checks passed     | **This doc.** Dispute window opens.   |

The first two are clean. The third is the messy case where:
- Robot delivered to the right GPS coords on time
- Sensor hash recorded
- All on-chain checks passed
- BUT: the goods were wrong, damaged, never picked up, or otherwise off

The verifier can't detect this — it's about the *content* of the work, not the location. So we need a dispute layer.

---

## v1 — Off-protocol disputes (current)

In v1, the contract has no dispute method. Disputes happen via Rova's protocol team manually triaging:

1. Agent emails `disputes@rova.xyz` with `jobId` + evidence (photo of wrong goods, recipient testimony, etc.)
2. Rova protocol team reads the robot's sensor pre-image (if operator opted into cloud sync) or asks the operator
3. Triage outcome:
   - **Side with agent** — operator refunds USDC manually + reputation hit applied off-chain
   - **Side with robot** — no action, dispute marked invalid
   - **Inconclusive** — split refund, both sides take partial reputation hit

This is fragile, low-volume, and only viable while v1 has ~50 total operators. It works until it doesn't.

---

## v1.5 — On-protocol disputes

The contract gets a `disputeJob` method:

```solidity
function disputeJob(uint256 jobId) external {
    Job storage job = jobs[jobId];
    require(msg.sender == job.client, "NotClient");
    require(job.status == COMPLETED, "JobNotCompleted");
    require(block.timestamp <= job.settledAt + DISPUTE_WINDOW_S, "DisputeWindowClosed");
    require(disputes[jobId].opened == 0, "AlreadyDisputed");

    disputes[jobId] = Dispute({
        opened: block.timestamp,
        claimDeadline: block.timestamp + 24 hours,
        resolved: 0,
        outcome: DisputeOutcome.PENDING,
    });
    emit DisputeOpened(jobId, msg.sender);
}
```

### Dispute parameters

- `DISPUTE_WINDOW_S = 24 hours` — agent must open dispute within 24h of settlement
- `CLAIM_DEADLINE = 24 hours` — robot has 24h after dispute opens to publish sensor pre-image
- `RESOLVER_ROLE` — initially Rova admin; v2 moves to DAO governance

### Dispute lifecycle

```
SETTLED ──disputeJob──> PENDING ──claim window──> [auto-resolve or manual]
                                                       │
                              ┌────────────────────────┼────────────────────────┐
                              │                        │                        │
                              ▼                        ▼                        ▼
                      OUTCOME.UPHELD            OUTCOME.OVERTURNED      OUTCOME.INCONCLUSIVE
                      (robot keeps payout)      (refund to agent +      (split refund)
                                                 50% slash)
```

---

## The 24-hour claim window

When `disputeJob` fires, the robot operator is notified. They have 24 hours to publish the sensor pre-image:

```solidity
function publishPreImage(uint256 jobId, bytes calldata preImage) external {
    Dispute storage d = disputes[jobId];
    require(d.opened != 0, "NoDispute");
    require(block.timestamp <= d.claimDeadline, "ClaimWindowClosed");
    require(keccak256(preImage) == verifier.getProof(jobId).sensorHash, "PreImageMismatch");
    require(msg.sender == registry.getRobot(jobs[jobId].robotId).owner, "NotOperator");

    d.preImagePublished = block.timestamp;
    emit PreImagePublished(jobId, preImage);
}
```

### Three outcomes from the claim window

#### A. Robot publishes valid pre-image
- Hash matches the recorded `sensorHash`
- Pre-image is the raw sensor data the robot used
- Agent (or resolver) reviews; if data supports the robot, dispute resolves UPHELD; if it supports the agent, resolves OVERTURNED
- See "Manual resolution" below

#### B. Robot publishes invalid pre-image
- Hash doesn't match
- Robot has now admitted in public that the recorded hash was fake
- Auto-resolves OVERTURNED. Slash 50% (significantly higher than the normal 10%).
- The operator's reputation tanks. Other agents see the slashing event.

#### C. Robot publishes nothing within 24h
- Auto-resolves OVERTURNED. The robot couldn't or wouldn't defend.
- Slash 25% (between normal and admitted-fraud).

The mechanism: an honest robot can defend trivially (publish the bytes). A dishonest one is either caught (B) or self-incriminates (C).

---

## Manual resolution (Case A)

If the robot publishes valid pre-image, the protocol resolver (admin in v1.5; DAO in v2) reviews:

1. Sensor data is now public — anyone can inspect the recorded weight delta, image hashes, IMU integration
2. Agent presents counter-evidence (photos, recipient statement)
3. Resolver decides within 7 days

```solidity
function resolveDispute(uint256 jobId, DisputeOutcome outcome) external onlyResolver {
    Dispute storage d = disputes[jobId];
    require(d.outcome == DisputeOutcome.PENDING, "AlreadyResolved");
    d.outcome = outcome;
    d.resolved = block.timestamp;

    if (outcome == DisputeOutcome.OVERTURNED) {
        // Reverse the settlement
        Job storage job = jobs[jobId];
        ROVARegistry.Robot memory robot = registry.getRobot(job.robotId);

        // Robot returns the payout from its wallet (operator must keep enough USDC)
        usdc.transferFrom(robot.wallet, job.client, job.bid - protocolFee);
        // Operator's stake covers any shortfall
        if (shortfall > 0) {
            registry.slash(job.robotId, shortfall);
        }
        // Additional slash for losing the dispute
        registry.slash(job.robotId, job.bid / 4);  // 25% extra
    } else if (outcome == DisputeOutcome.INCONCLUSIVE) {
        // 50-50 split
        usdc.transferFrom(robot.wallet, job.client, (job.bid - protocolFee) / 2);
    }

    emit DisputeResolved(jobId, outcome);
}
```

### Why robot returns from wallet (not from stake first)

Robots get paid in USDC into their ERC-4337 wallet. The dispute mechanism *prefers* to claw back from that wallet — the funds are right there. The operator's stake is the fallback for shortfalls (e.g., the operator already swept the robot's wallet to treasury).

The operator running a Rova fleet should leave a buffer in robot wallets to cover dispute windows. Sweeping aggressively + having a dispute open against you = stake slash.

---

## Operator UX during a dispute

The Operator's dashboard shows the open dispute prominently:

```
┌─────────────────────────────────────────────────────────────────────┐
│  🟠 OPEN DISPUTE — JOB-7c2a                                          │
│                                                                     │
│  Aboki-Restock-Bot disputed this job (claimed: damaged goods).      │
│  You have 18h 32m to publish sensor pre-image or lose by default.   │
│                                                                     │
│  Sensor data location:                                              │
│    Local file: /var/rova/sensor-pi/job_7c2a.bin (45 KB)             │
│    Or cloud-sync URL: s3://rova-ops/.../job_7c2a.bin                │
│                                                                     │
│  [ Publish pre-image ]   [ Concede dispute ]   [ View evidence ]    │
└─────────────────────────────────────────────────────────────────────┘
```

Three buttons:
- **Publish pre-image** — UI handles the upload + the on-chain call. One tx.
- **Concede dispute** — operator gives up; auto-OVERTURNED. Sometimes the right call when the dispute is clearly valid.
- **View evidence** — what the agent uploaded (photos, statement)

---

## Agent UX during a dispute

The agent's `/agent/jobs/[id]` page shows:

```
┌─────────────────────────────────────────────────────────────────────┐
│  DISPUTE OPEN — JOB-7c2a                                            │
│                                                                     │
│  Status: Awaiting robot pre-image (publishes in 18h 32m or default) │
│                                                                     │
│  Evidence uploaded:                                                 │
│    [ photo_damaged_goods.jpg ]                                       │
│    Statement: "Goods arrived but bottles broken. Smell of leak…"     │
│                                                                     │
│  Outcome will appear here. Expected resolution: 24-48h               │
│                                                                     │
│  [ Add evidence ]   [ Withdraw dispute ]                            │
└─────────────────────────────────────────────────────────────────────┘
```

Withdrawing a dispute is final — agent loses the right to re-dispute. Useful when the agent realizes they were wrong (e.g., goods were actually fine, they mis-attributed an error).

---

## What it costs to dispute

A dispute has a cost gate. The agent pays a refundable bond when opening:

```solidity
require(usdc.transferFrom(msg.sender, address(this), DISPUTE_BOND), "BondMissing");
```

`DISPUTE_BOND = 5 USDC` (configurable).

- If dispute resolves OVERTURNED → bond refunded
- If dispute resolves UPHELD → bond burned (no refund) — anti-griefing
- If dispute resolves INCONCLUSIVE → 50% refund

This stops agents from disputing every borderline-cheap loss.

---

## Reputation effects

A dispute affects reputation independent of cash outcomes:

| Outcome              | Robot rep delta | Agent rep delta |
| -------------------- | --------------- | --------------- |
| UPHELD (robot wins)  | +0              | -20 (false dispute) |
| OVERTURNED (agent wins) | -50           | +5              |
| INCONCLUSIVE         | -15             | -5              |
| Robot conceded       | -30 (less bad than auto-OVERTURNED) | +5 |
| Withdrawn            | +0              | -5              |

These deltas apply to a 0-10000 scale. Multiple disputes compound. A robot with 5000 starting rep that loses 3 disputes drops to ~4850 — still functional, but other operators with 4500+ thresholds may start filtering it out.

---

## Sensor pre-image expiry

Robots are required to keep sensor pre-images for 90 days locally. The operator's cloud sync (if enabled) extends indefinitely.

If a dispute opens and the pre-image is **lost** (corrupted file, expired retention, etc.):
- Operator can't publish
- Auto-resolves OVERTURNED at deadline
- Robot stake slashed 25%

Lesson: pin pre-images to durable storage if you handle valuable jobs. The robot SDK ships with optional S3 upload that operators turn on for production.

---

## What disputes don't cover

- **Disputes over the SLA window** — these are auto-resolved by the verifier. No human review.
- **Disputes over the GPS proximity** — same. The tolerance is the rule.
- **Disputes after the 24-hour window** — closed. Agent should have moved faster.
- **Disputes over operator policy decisions** — operators decline offers freely; agents have no recourse, just move on.

The dispute mechanism is narrow on purpose: it covers the gap between "verifier said OK" and "client says not OK." It does not turn into a general arbitration forum.

---

## Telemetry

```
dispute.opened                (jobId, agentAddress, bond_usdc)
dispute.pre_image_published   (jobId, valid: bool)
dispute.evidence_added        (jobId, party: agent | operator)
dispute.resolved              (jobId, outcome, resolver)
dispute.bond.refunded         (jobId)
dispute.bond.burned           (jobId)
dispute.withdrawn             (jobId)
```

Public dashboard at `/disputes` shows aggregate dispute volume + outcome breakdown. Transparency is a feature.

---

## v2 evolution

- DAO-governed resolver pool (random selection of staked resolvers)
- Slashing of resolvers who rule against majority consensus (game-theoretic Schelling point)
- Per-task-type dispute parameters (high-value tasks have longer windows + higher bonds)
- ZK-attested sensor pipelines that make pre-image publication trivial (auto-decryption from secured enclave)
- Cross-chain dispute references (an agent's other-chain Rova reputation as evidence)

---

## Related

- `PROOF.md` § Dispute path — what makes the on-protocol dispute possible
- `STATE-MACHINE.md` § COMPLETED — the state disputes attach to
- `AGENT-DISPUTE.md` — the agent's perspective on opening one
- `ARCH/DISPUTE-RESOLUTION.md` — the algorithm + on-chain details
- `ERRORS.md` § D — every dispute failure mode
- `POLICIES.md` § blacklist — operator's preventive tool against repeat-disputer agents
