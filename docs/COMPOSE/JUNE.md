# COMPOSE/JUNE

> How Rova composes with [[june-project]] — the agentic stablecoin treasury for B2B. June agents pay Rova robots. Rova robots invoice June treasurers.

v1.5 / v2 priority. v1 agents fund their own wallets directly; June isn't required.

---

## Frame

June is a separate Rova-family product. It's a treasury management system where:
- A human creator funds a "June grant" with stablecoin
- An autonomous "Treasurer" agent disburses to operating agents under a budget
- Operating agents spend within their grants on Rova jobs (and other commitments)

The composition: **June owns money; Rova owns work. June Treasurers fund Rova-posting sub-agents.**

---

## The two-tier agent pattern

In v1, a Rova agent is a single thing: a wallet, a session key, a per-day spend cap.

With June, that single agent splits into two:

```
        Human creator (Adaeze)
              │
              │ funds + sets policy
              ▼
        June Treasurer agent
        (holds the treasury)
              │
              │ grants spendable USDC to children
              │ with per-day caps + scope
              ▼
        ┌──────────┬─────────────┬──────────────┐
        │           │              │              │
   Restock-Bot   Inspect-Bot  Delivery-Bot   Inventory-Bot
   (Rova agent)  (Rova agent) (Rova agent)   (Rova agent)
        │           │              │              │
        ▼           ▼              ▼              ▼
   posts Rova    posts Rova    posts Rova    posts Rova
   jobs           jobs           jobs           jobs
```

Each sub-agent is a fully independent Rova agent. The Treasurer doesn't post Rova jobs; it just funds.

---

## What June provides

- Treasury holding USDC
- Sub-grants to operating agents with constraints (daily cap, per-action cap, expires, allowed contracts)
- Audit trail of disbursements
- Human-readable approval workflow (Adaeze can approve/reject Treasurer's disbursements weekly)

---

## What Rova reads from June

In v1.5, Rova's dashboard can show "where this agent's money came from":

```
Agent          Aboki-Restock-Bot
Wallet          0xa7c1…da93
USDC balance    $342.18
Daily spend     $14.20 of $50 cap

  Source: June Grant #14 (from Adaeze)
          Granted: $500/month
          Used this month: $187.43
          Expires: 2026-06-15
```

This makes Rova's view of an agent richer:
- "Who's behind this money?" (the Treasurer)
- "Who's behind the Treasurer?" (the human creator)
- "What's the budget envelope?" (helps Operator weight risk)

Operators can use June metadata in policy:

```json
{
  "minGrantSizeUsdc": 100_00_00,    // accept only agents on grants ≥ $100/month
  "trustedTreasurers": ["0x...JuneCorpTreasury"],
  "rejectExpiredGrants": true        // refuse to take jobs from agents whose grant runs out mid-job
}
```

The robot SDK queries June at offer-evaluation time. If the agent's grant is about to expire (less than `slaMinutes` left), it can refuse — defense against agents that disappear mid-job.

---

## What June reads from Rova

The Treasurer agent's audit:

```
Sub-grant #14 (Aboki-Restock-Bot)
  Disbursed this month: $187.43
  Rova jobs: 38 ($164.20)
  Other contracts: $23.23

  Rova outcomes:
    Completed: 36
    Disputed: 1 (resolved in agent's favor)
    Failed: 1 (operator rejection)
```

Rova's `ROVAMarket` events are consumed by June's audit pipeline. Treasurer can see:
- Where the sub-agent's money went
- Whether it was well-spent (high completion rate)
- Whether to lift or lower the grant cap

A Treasurer that's June-aware can dynamically adjust sub-agent caps based on their Rova performance. Successful agents get bigger grants; agents with high dispute rates get smaller ones.

---

## Settlement flow with June

A typical sub-agent posting + completing a Rova job, with June in the loop:

```
1. Sub-agent's planner: "I need a $9 CARRY job."
2. Sub-agent checks its June grant: dailyCap = $50, used $14.20 today, $35.80 remaining. OK.
3. Sub-agent calls rova.jobs.postAndAssign(...) — locks $9 in escrow from its own wallet.
4. Robot executes, proof verifies.
5. Auto-settle: $4.79 → robot, $4.20 + $0.01 fee handled.
6. Sub-agent now has $4.21 less than before (cost of the job).
7. Treasurer's audit cron picks up the ROVAMarket events overnight and updates the grant ledger.
8. Adaeze opens her June dashboard, sees Aboki-Restock-Bot used $4.21 yesterday for CARRY jobs.
```

The Treasurer doesn't directly disburse for each Rova job. The grants pre-fund sub-agents; sub-agents spend autonomously within their caps.

---

## Why two products, not one

The argument for merging: "Rova should just have a built-in treasury management layer."

We don't merge because:

1. **Different audiences.** Rova users are operators + agents. June users are agent creators + treasurers. Two products, two onboarding flows.
2. **Different cycle times.** Rova is per-job (seconds). June is per-period (weeks). Different cadences need different UIs.
3. **June composes with non-Rova spending.** A June Treasurer can fund agents that buy data, run inference, license content — not just Rova jobs. Rova-internal treasury would be Rova-only.
4. **Forkability.** Operators might want to use Rova without June. Agents might want June without Rova. Coupling kills both.

The composition is voluntary. Each product stands alone; together they're stronger.

---

## Dependency direction

**Neither depends on the other.**

A Rova agent can exist without June (v1 mode — agent owns its own funded wallet).
A June Treasurer can exist without Rova (it can fund agents that do other things).

When they integrate (v1.5+), it's via:
- Rova reads June metadata for risk display + policy enforcement
- June reads Rova events for audit

Both queries are optional reads. Failure of one doesn't break the other.

---

## Naming / brand

When a Rova agent is funded by June, the Rova UI can show "Funded by June" badge — opt-in, the Treasurer agent's creator can disable. Used as a trust signal.

Treasurers can opt to publicize: "This Treasurer is operated by Roztomily Co (verified 2026-05-14)." Public claim, verifiable via Chaum's identity tree.

---

## Use case: enterprise pilot

A larger pilot use case for Rova that depends on June:

```
"Roztomily PR Agency wants to run a fleet of 8 'Logistic Agents' for client deliveries.
Each agent posts ~50 Rova jobs/day. Per-agent daily cap: $200. Total monthly Rova spend
across all 8: ~$24k."

→ Roztomily creates a June Treasurer with $30k/month treasury.
→ Treasurer disburses 8 sub-grants of $5,000/month each.
→ Sub-grants spend autonomously on Rova throughout the month.
→ End of month: Treasurer audit shows actual spend; unspent funds roll back.
→ Roztomily's finance lead approves monthly Treasurer top-up.
```

Without June, Roztomily would need 8 separate hot wallets, each funded manually, with no audit trail. June makes this tractable.

---

## Telemetry shared

Both products emit events the other consumes:

```
Rova:
  JobPosted(jobId, client, ...)
  JobCompleted(jobId, robot, payout)
  JobFailed(jobId, robot, reason)

June:
  GrantCreated(grantId, fromTreasury, toAgent, amount, cap)
  GrantRevoked(grantId)
  TreasurerApproval(period, action)
```

Each product's indexer subscribes to the other's events as needed.

---

## Related

- `[[june-project]]` — full June project memory
- `AUTH.md` § Agent — Rova's spending cap is what June grants enforce
- `BIZ/PRICING.md` — the protocol fee June Treasurers indirectly pay (via sub-agents)
- `POLICIES.md` § creatorAllowlist — Rova policy primitives that can reference June
- `ROADMAP.md` § v1.5 — when June↔Rova reads land
- `COMPOSE/CHAUM.md` — identity overlay shared between products
