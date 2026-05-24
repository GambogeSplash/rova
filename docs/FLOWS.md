# FLOWS

> The full inventory of flows in Rova. This is the index that every per-flow spec hangs off.

Every flow has: a number, a name, a primary audience, a priority (v1 / v1.5 / v2), a one-line summary, and a link to its detailed spec (when written). Read this doc when you need to remember which flows exist and where they live.

---

## Index

Rova has **23 flows** across three audiences (Operator, Agent, Robot/Dev) plus visitor-facing and cross-cutting flows. Numbering is stable — once a flow has a number, it keeps that number even if its priority shifts. New flows get the next unused integer.

### Operator flows (`9` flows)

| #  | Flow                                 | Spec                                  | Pri    | Summary                                                                                  |
| -- | ------------------------------------ | ------------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| 1  | Operator onboarding                  | [ONBOARDING.md](./ONBOARDING.md)      | v1     | First install — install SDK on robots, set up wallet, write first policy                 |
| 2  | Register a robot                     | [ROBOT-REGISTER.md](./ROBOT-REGISTER.md) | v1  | Add a robot to the fleet, mint robot wallet, stake, call `ROVARegistry.registerRobot`     |
| 3  | Author / edit policy                 | [POLICY-EDITOR.md](./POLICY-EDITOR.md) | v1    | Plain-language rule builder for the 10 policy primitives (see `POLICIES.md`)             |
| 4  | Daily triage dashboard               | [DASHBOARD.md](./DASHBOARD.md)        | v1     | Operator's "Today" — incoming offers, active jobs, alerts, settlements, fleet health     |
| 5  | Approve / decline an incoming offer  | [JOB-APPROVAL.md](./JOB-APPROVAL.md)  | v1     | When `autoAccept: false`, the offer card with countdown and approve/decline              |
| 6  | Resolve a dispute                    | [DISPUTE-RESOLUTION.md](./DISPUTE-RESOLUTION.md) | v1 | Failed-proof judgment — release escrow, partial refund, or full withhold + slash         |
| 7  | Settlement ledger                    | [SETTLEMENT-LEDGER.md](./SETTLEMENT-LEDGER.md) | v1 | Every USDC in/out per robot per task, exportable, linked to receipts                     |
| 8  | Fleet ops controls                   | [FLEET-OPS.md](./FLEET-OPS.md)        | v1     | Pause / resume robots, adjust policy in-flight, emergency-stop                            |
| 9  | Mobile check-in                      | [MOBILE.md](./MOBILE.md)              | v1.5   | Phone-sized companion view for daily triage when not at desk                              |

### Agent flows (`4` flows)

| #  | Flow                                 | Spec                                  | Pri    | Summary                                                                                  |
| -- | ------------------------------------ | ------------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| 10 | Browse offerings via SDK             | [AGENT-BROWSE.md](./AGENT-BROWSE.md)  | v1     | Virtuals agent queries Rova Registry indexer for active offerings matching constraints   |
| 11 | Post a job + assign robot            | [AGENT-POST.md](./AGENT-POST.md)      | v1     | Agent calls `postJob` to lock bounty, then `assignRobot` to select an offering           |
| 12 | Monitor execution + receive proof    | [AGENT-MONITOR.md](./AGENT-MONITOR.md) | v1    | Subscribe to robot heartbeats + chain events; auto-call `settleJob` on `ProofVerified`   |
| 13 | Dispute a completed job              | [AGENT-DISPUTE.md](./AGENT-DISPUTE.md) | v1.5  | When proof verified but work was bad — open a dispute window, demand sensor pre-image    |

### Robot / Developer flows (`6` flows)

| #  | Flow                                 | Spec                                  | Pri    | Summary                                                                                  |
| -- | ------------------------------------ | ------------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| 14 | Robot SDK identity + offerings       | [ROBOT-IDENTITY.md](./ROBOT-IDENTITY.md) | v1  | Robot SDK provisions wallet, registers on-chain, publishes Job Offerings                  |
| 15 | Execute a job → submit proof         | [ROBOT-EXECUTE.md](./ROBOT-EXECUTE.md) | v1    | Receive assignment, run policy check, physically execute, compute sensor hash, submit proof |
| 16 | Stake ROVA + handle slashing         | [ROBOT-STAKE.md](./ROBOT-STAKE.md)    | v2     | Stake on registration, top up, withdraw after deactivation, react to slashing events     |
| 17 | ROS2 SDK quickstart                  | [SDK-ROBOT.md](./SDK-ROBOT.md)        | v1     | Developer integration guide for embedding the Rova SDK in a ROS2 robot stack             |
| 18 | ACP SDK quickstart                   | [SDK-AGENT.md](./SDK-AGENT.md)        | v1     | Developer integration guide for building a Virtuals agent that posts Rova jobs           |
| 19 | Robot fleet CI/CD deploy             | [SDK-CI-CD.md](./SDK-CI-CD.md)        | v2     | Deploy a policy / SDK update to a fleet of N robots without taking them offline          |

### Visitor / cross-cutting flows (`4` flows)

| #  | Flow                                 | Spec                                  | Pri    | Summary                                                                                  |
| -- | ------------------------------------ | ------------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| 20 | In-browser warehouse simulator       | [SIMULATOR.md](./SIMULATOR.md)        | v1     | The /simulator surface — walk through a Rova loop with mock robots, mock agents          |
| 21 | Simulator → real onboarding          | [SIMULATOR-TO-REAL.md](./SIMULATOR-TO-REAL.md) | v1.5 | Convert a simulator session into a real fleet (deep-link from sim into onboarding)       |
| 22 | Error states (across all surfaces)   | [ERRORS.md](./ERRORS.md)              | v1     | Robot disconnect, GPS jam, escrow stuck, dispute deadlock, slashing — every failure UI   |
| 23 | Marketing surfaces                   | [MARKETING.md](./MARKETING.md)        | v1     | Landing page + about + apply — copy, layout, the public face of the protocol             |

---

## Priority distribution

| Priority | Count | Flows                                                                                |
| -------- | ----- | ------------------------------------------------------------------------------------ |
| **v1**     | **18**  | 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 14, 15, 17, 18, 20, 22, 23                       |
| **v1.5**   | **3**   | 9, 13, 21                                                                            |
| **v2**     | **2**   | 16, 19                                                                               |

The v1 set is large because Rova has three audiences. Each audience needs:

- An onboarding flow (1, 14, 20)
- A primary daily-use flow (4, 11, 15)
- A core action flow (3, 10, 14 already covers offerings)
- A money flow (7, 12, 14)
- An exception flow (6, 8, 22)

The asymmetry — 9 Operator flows vs. 4 Agent flows — reflects that the Operator has a UI surface, the Agent is purely SDK-driven. The Agent's "flow" is mostly an SDK contract; the UI work is on the Operator side.

---

## Flow dependencies

Some flows can't be built before others. The dependency graph:

```
Foundation (no deps):
  20  SIMULATOR             — can build entirely standalone
  23  MARKETING             — independent
  17  SDK-ROBOT             — needs contracts deployed (they are)
  18  SDK-AGENT             — needs contracts deployed (they are)

Identity layer (depends on SDKs):
   2  ROBOT-REGISTER        ← 17
  14  ROBOT-IDENTITY        ← 17
  11  AGENT-POST            ← 18

Operator UI (depends on identity layer + policy):
   1  ONBOARDING            ← 2, 3
   3  POLICY-EDITOR         ← standalone (just an editor over a JSON schema)
   4  DASHBOARD             ← 2, 11 (needs both sides to show meaningful data)
   5  JOB-APPROVAL          ← 4 (lives inside dashboard)
   8  FLEET-OPS             ← 4

Agent UI (mostly SDK; no separate UI in v1):
  10  AGENT-BROWSE          ← 14 (offerings must exist)
  12  AGENT-MONITOR         ← 11

Robot UI (also mostly SDK):
  15  ROBOT-EXECUTE         ← 14, 11

Execution-tail flows (depend on full happy path):
   7  SETTLEMENT-LEDGER     ← 12, 15
   6  DISPUTE-RESOLUTION    ← 7, 15 (v1: off-protocol; v1.5: on-protocol)
  22  ERRORS                ← all v1 happy paths first (so you know what failure looks like)

Forward-compat (v1.5 / v2):
   9  MOBILE                ← 4 (mobile is desktop's reduction)
  13  AGENT-DISPUTE         ← 6
  16  ROBOT-STAKE           ← 14
  19  SDK-CI-CD             ← 17
  21  SIMULATOR-TO-REAL     ← 1, 20
```

If you're building v1 from scratch, the topological order is roughly:

```
Week 1   17, 18, 20, 23                    (foundations + simulator + marketing)
Week 2   2, 14, 3                           (identity + policy authoring)
Week 3   11, 15                              (agent posts; robot executes — close the loop)
Week 4   4, 5, 8                              (operator dashboard)
Week 5   12, 7                                (agent monitor + settlement ledger)
Week 6   6, 1, 22                              (disputes, full onboarding, error catalog)
```

That's the v1 build order. Rova ships its v1 surface in roughly six weeks of focused work after contracts are deployed. The current state (per the codebase) has ~70% of this done in some form — the spec docs are catching up to the implementation.

---

## What a "flow" actually contains

Each flow spec is a single Markdown document with this canonical structure:

```
# {FLOW NAME}

> One-sentence frame.

## Audience
Who walks this flow.

## Entry points
How a user arrives here (URL, deep link, dashboard tile, SDK call, event).

## Preconditions
What must be true before the flow can start.

## Happy path (numbered)
Step-by-step: user action → system response → next state. Numbered. Tight.

## Edge cases
Each as a labeled subsection with: trigger, expected behavior, UI text, recovery.

## Failure modes
Bad inputs, race conditions, network failures. Each with: detection, user message, recovery.

## Visual reference
Either ASCII wireframe or link to figma frame / live surface.

## Contracts / events touched
The on-chain methods called and events listened for.

## Out of scope
What this flow explicitly does NOT do, and where it goes if it tried.

## Related
Links to upstream and downstream flows.
```

Every flow spec is between 150 and 500 lines. Anything shorter is under-specified. Anything longer probably contains multiple flows that should be split.

---

## What's NOT a flow

Some things look like flows but live elsewhere:

- **Components** (job card, robot tile, proof receipt) → `COMPONENTS/*.md`
- **Architecture** (proof pipeline, dispute resolution algorithm) → `ARCH/*.md`
- **Cross-cutting concepts** (the policy DSL, the proof primitive, the state machine) → top-level docs (`POLICIES.md`, `PROOF.md`, `STATE-MACHINE.md`)
- **Content** (landing-page copy, microcopy, SDK reference) → `COPY/*.md`

A flow is something a *human or agent walks through* over time. Components and concepts are static. Architecture is structural. Content is fixed text.

If you're not sure, ask: "Does this have a start and an end? Does it have a user (or agent) walking through it? Does it touch UI?" If yes to all three, it's a flow.

---

## Maintenance rules

1. **Numbers are forever.** Flow 13 stays flow 13 even if it's deferred to v3.
2. **Priority is mutable.** A v2 flow can become v1.5 or v1 when it's ready.
3. **One flow per Markdown file.** No combined "AGENT.md" with three flows inside.
4. **Cross-link aggressively.** Every spec should link upstream and downstream flows.
5. **This file is the canonical index.** When you add a new flow, add it here first, with a number, and then write the spec.

---

## Related

- `STATE-MACHINE.md` — most of the v1 flows are walks through this state machine
- `USE-CASES.md` — three personas walking subsets of these flows end-to-end
- `IA.md` — the URL map; many flows correspond to dashboard tabs or SDK methods
- `ROADMAP.md` — when each priority tier ships
