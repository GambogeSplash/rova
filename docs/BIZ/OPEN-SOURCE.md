# BIZ/OPEN-SOURCE

> What's open, what's commercial. The licensing posture, and why each piece is on its side of the line.

---

## TL;DR

```
SDKs              MIT       ← maximally permissive; we want adoption
Contracts          MIT       ← anyone can fork the protocol
Indexer            MIT       ← anyone can self-host
Spec docs          CC BY-SA  ← attribution; share-alike for derivatives
Marketing site code  Source-available, not OSI license   ← we keep editorial control
Brand + logos      Reserved   ← trademark
Hosted dashboard   Commercial; access is permissioned
Audit reports      Public     ← transparency
```

---

## SDKs (MIT)

`@rova/agent-sdk` and `rova-robot-sdk` are MIT licensed.

Why MIT (not GPL, not BSL):

- **Adoption first.** SDKs are the easiest entry point for an agent or robot builder. Any restriction friction kills adoption.
- **Network effects on the protocol, not the code.** Rova's moat is the on-chain marketplace + the policy library + the operator community. The SDK is the keys to the door, not the door.
- **Forking is fine.** If someone forks `rova-robot-sdk` to add a feature we won't merge, that's good for the protocol — more robots, more compatible.

We accept that a competitor could fork the SDKs to power a fork of Rova. We bet the marketplace + operator network is the moat.

---

## Contracts (MIT)

Solidity source for all four contracts (`ROVARegistry`, `ROVAMarket`, `ROVAVerifier`, `ROVAWallet`) is MIT.

A fork of the contracts is a fork of the protocol. Anyone can:
- Read the source
- Deploy their own copy
- Modify and redeploy
- Use the source as reference for their own protocol

We support this for two reasons:

1. **Auditability.** Any operator who's about to stake real money should be able to read the code that holds it. A closed-source escrow is a non-starter.
2. **Modifiability.** Niche cases (e.g., an operator wanting a tweaked dispute mechanism) can be served by a fork-and-deploy without us building edge-case features.

Forks aren't backed by Rova-protocol's brand or insurance. They're their own protocols.

---

## Indexer (MIT)

The indexer source + Docker image are MIT. Operators can:
- Self-host their own indexer
- Skip the Rova-hosted API entirely
- Customize the API surface

Self-hosters forfeit the convenience (we provide a tuned + monitored hosted version), but they gain:
- Full data residency
- Custom retention policies
- API rate limits set by themselves

This is the load-bearing license for compliance-sensitive operators (regulated industries, gov contracts).

---

## Spec docs (CC BY-SA 4.0)

The `/docs/` directory in the Rova repo is CC BY-SA 4.0 (Creative Commons Attribution-ShareAlike).

Why CC BY-SA (not MIT, not CC0):

- **Attribution preserves origin.** If our spec for the proof primitive becomes industry-standard, we want a paper trail showing where it came from.
- **Share-alike prevents enclosure.** A competitor can't take our docs, modify them, and ship as their own closed standard.
- **Derivatives are encouraged.** Translations, port to other protocols, academic citations — all explicitly OK.

The CC license applies to the prose. Code samples inside the docs are MIT (so they can be lifted into projects).

---

## Marketing site code (source-available, no OSI license)

The marketing site + dashboard code is at `github.com/GambogeSplash/rova` (currently private; will be public at v2 launch).

License will be: **source-available, not OSI**.

- You can read the code
- You can clone it for personal evaluation
- You cannot redeploy "Rova" branded
- You cannot sell a SaaS that wraps this code
- Modifications for self-host are explicitly NOT supported (the dashboard requires hosted indexer + paymaster; we don't promise their interfaces are stable)

Why not MIT for the dashboard:

- The brand "Rova" is what we monetize visibility on
- Editorial control matters — we don't want forks reading as Rova-endorsed
- Most users want hosted, not self-host; the constraint isn't a burden

Operators who want a self-hostable dashboard get one in v2 as a separate, MIT-licensed reference implementation. The hosted Rova dashboard stays commercial.

---

## Brand + logos (trademark reserved)

"Rova" as a name + the logo are trademarks of Rova Protocol Foundation (TBD).

- You can use the brand to refer to the protocol ("My agent uses Rova")
- You cannot use the brand on a competing product ("Rova-Pro from Acme Robotics")
- You cannot use the logo in product UI without a license

Trademark filings: USA, EU, Nigeria (where the team operates). Forks of the protocol must rebrand.

---

## Hosted dashboard (commercial)

The Rova-hosted dashboard at `rova.xyz/dashboard` is access-controlled — only authenticated operators can use it. The hosted product is commercial in the sense that we operate it. Access is free; we earn from the protocol fee, not the dashboard.

A reference open-source dashboard ships in v2 for self-hosters. Sufficient to operate a fleet but without the polish + integrations of the hosted version.

---

## Audit reports (public)

Every contract audit + security review is published at `https://rova.xyz/audits/` and mirrored in `contracts/audits/` in the repo.

- Audit findings, severity, fix status — all public
- Auditor's report PDF (unaltered)
- Our response to each finding
- Re-audit results

Trust is built by transparency, not by keeping audits private.

---

## Patent posture

We don't file patents. We commit not to.

The proof primitive, the policy DSL, the three-actor marketplace structure — all of these are prior art the moment we publish the docs. No defensive moat via patents.

Why: patents in protocol-land are usually offensive (sue competitors), not defensive (deter them). We'd rather compete on execution + community than legal threats.

---

## Contributor License Agreement (CLA)

External contributions to MIT-licensed components require a lightweight CLA:
- Contributor confirms they own the code or have rights to contribute
- Contributor grants Rova Protocol Foundation a perpetual license
- Contributor retains their own rights

CLA is a single-form signing flow via CLA-Assistant on GitHub. No corporate-style boilerplate.

---

## What this means for someone evaluating Rova

If you're an Operator:
- The contracts your money sits in are MIT and audited (you can verify)
- The dashboard you use is hosted by us (you trust us with frontend; backend is the chain)
- You can self-host the indexer if you don't trust ours

If you're an Agent Builder:
- SDK is MIT — use it however you want
- Your agent is your IP — Rova doesn't claim derivatives

If you're a Robot Maker:
- Robot SDK is MIT — use it in your platform, modify it, redistribute
- Your robot firmware is your IP

If you're a Researcher:
- Spec docs are CC BY-SA — cite, port, translate
- Audit reports are public — write papers about them

If you're a Forker:
- Contracts + SDKs + indexer: MIT, do whatever
- Dashboard code: read-only
- "Rova" brand: rebrand your fork

---

## Why not 100% MIT

We considered making everything MIT. Rejected because:

- The brand has commercial value (BD conversations, partner trust); without trademark protection, anyone could pass as Rova
- The hosted dashboard is the user funnel; clones would dilute it
- Editorial control over the spec docs prevents "Rova standard fork wars"

100% MIT works for projects that monetize on the brand alone (like Docker pre-Docker Inc). We monetize on protocol fees + hosted operations. Different model, different licensing.

---

## Related

- `BIZ/PRICING.md` — how we monetize the open thing
- `OPS/DEPLOY.md` — what we operate that's commercial
- `SDK.md` — the SDKs that are open
- `ARCH/CONTRACTS.md` — the contracts that are open
- `MARKETING.md` — the brand surface that's controlled
