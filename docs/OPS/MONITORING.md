# OPS/MONITORING

> What we watch, what we alert on, where the dashboards live. The signals that tell us the protocol is healthy or sick.

---

## Tiers of monitoring

Three tiers, three audiences:

| Tier               | Audience                              | What it shows                                            | Page who when?            |
| ------------------ | ------------------------------------- | -------------------------------------------------------- | ------------------------- |
| **Protocol**       | Rova team                              | Indexer, contracts, paymaster, bundler health             | on-call always            |
| **Operator-facing** | Operators (their own fleet)            | Fleet health, robot anomalies, policy effectiveness       | Operator's choice         |
| **Public**          | Anyone                                 | Aggregate stats, dispute volume, fee accumulation         | (no paging — transparency) |

---

## Protocol-tier signals

### Indexer

| Signal                                | Threshold (warn / page) | Source       |
| ------------------------------------- | ----------------------- | ------------ |
| `indexer.blocks_behind_tip`           | > 30 / > 100             | indexer health|
| `indexer.events_processed_per_block`  | < 1 / 0 for 5 min        | indexer       |
| `indexer.postgres_write_latency_ms`   | > 100 / > 1000           | indexer       |
| `indexer.redis_write_latency_ms`      | > 20 / > 200             | indexer       |
| `indexer.uptime_s`                    | < 60 (just restarted)    | indexer       |
| `indexer.sse_connections_active`      | drops > 20% in 5 min     | indexer       |
| `indexer.reorg_depth`                 | > 12 (deep reorg)        | indexer       |

### Contracts

| Signal                                | Threshold              | Source        |
| ------------------------------------- | ---------------------- | ------------- |
| `contract.jobs_failed_rate_1h`        | > 5% / > 15%           | derived from chain |
| `contract.proof_rejection_rate_1h`    | > 3% / > 10%           | derived from chain |
| `contract.settlement_lag_p95_s`       | > 30 / > 120           | derived       |
| `contract.dispute_open_count`         | > 5 unresolved 24h     | dispute contract |
| `contract.slash_amount_1h`            | > 10 ROVA              | derived       |

### Paymaster

| Signal                                | Threshold              | Source        |
| ------------------------------------- | ---------------------- | ------------- |
| `paymaster.balance_eth`               | < 1 ETH / < 0.5 ETH    | RPC read      |
| `paymaster.sponsored_ops_per_min`     | drops > 50% in 5 min   | bundler logs  |
| `paymaster.rejection_rate`            | > 1% / > 5%            | bundler logs  |

### Bundler

| Signal                                | Threshold              | Source        |
| ------------------------------------- | ---------------------- | ------------- |
| `bundler.userop_inclusion_lag_s`      | p95 > 10 / > 30        | bundler logs  |
| `bundler.userop_rejection_rate`       | > 1% / > 5%            | bundler logs  |
| `bundler.endpoint_reachable`          | down for 60s           | synthetic probe |

### Site

| Signal                                | Threshold              | Source        |
| ------------------------------------- | ---------------------- | ------------- |
| `site.5xx_rate`                       | > 1% / > 5%            | Vercel metrics |
| `site.p95_latency_ms`                 | > 1000 / > 3000        | Vercel        |
| `site.build_failure`                  | any                    | Vercel webhook|

---

## Operator-tier signals

Surfaced per-operator in `/dashboard`:

| Signal                                | Where                | Trigger                                                |
| ------------------------------------- | -------------------- | ------------------------------------------------------ |
| Robot offline > 5 min                 | Alerts tile          | heartbeat gap > 5 min                                  |
| Battery thermal warning               | Alerts + tile        | SDK reports thermal flag in heartbeat                  |
| Repeated policy rejects (≥ 8 in 1h)   | Alerts               | rejection count exceeds threshold                      |
| GPS failures cluster                  | Alerts               | ≥ 3 GPS_MISMATCH rejections in 24h on one robot        |
| SLA breach cluster                    | Alerts               | ≥ 3 SLA_BREACH in 24h on one robot                     |
| Dispute opened                        | Alerts (high)        | DisputeOpened event for this operator's fleet          |
| Daily withdraw cap approaching        | Banner               | 80% of cap consumed                                    |
| Stake low (< 50 ROVA)                 | Robot tile           | per-robot                                              |
| Policy out of sync                    | Robot tile           | local policy version < dashboard version > 1h          |

Operators configure delivery via `/dashboard/settings`:
- Browser notification (default)
- Email (provided at onboarding)
- Telegram (v1.5; bot integration)
- Webhook to operator's existing alerting (Slack, PagerDuty)

---

## Public-tier dashboard

A `/stats` page on the marketing site. Refreshed every 5 minutes from the indexer.

```
ROVA Protocol — Public Stats

Lifetime
  Total jobs settled            14,302
  Total USDC settled            $87,415
  Total protocol fees            $262.25
  Total slashes (ROVA)            18.4
  Active robots                  47
  Active operators                23
  Active offerings                104

Last 24h
  Jobs settled                   213
  USDC settled                    $1,247.18
  Avg completion time             7m 42s
  Median bounty (CARRY)          $5.20

Disputes
  Open                            3
  Resolved this week              7
  Outcomes (this week)            4 UPHELD · 2 OVERTURNED · 1 INCONCLUSIVE

Contracts                       deployed Feb 12, 2026
  ROVARegistry                  0x...
  ROVAMarket                    0x...
  ROVAVerifier                  0x...
```

No login required. The protocol is transparent by design — operators + agents can verify the published metrics against on-chain data.

---

## Dashboards

Grafana hosted at `grafana.rova.xyz`. Three primary dashboards:

### `Indexer Health` (protocol tier)
- Blocks-behind-tip chart (line, last 24h)
- Events-per-block histogram
- API request latency p50/p95/p99
- Active SSE connections count
- Error rate by route

### `Contract Health` (protocol tier)
- Job lifecycle funnel (posted → assigned → settled / failed)
- Settlement latency distribution
- Proof rejection rate by reason
- Fee accumulation curve
- Stake total (ROVA) over time

### `Fleet Health` (operator self-serve; per-operator scoped)
- Earnings by day/week
- Robot uptime
- Policy rejection breakdown
- Completion time by task type
- Slash events

---

## Alerts wiring

Sources → routing:

```
indexer metrics    → Prometheus       → Alertmanager → PagerDuty (paging) + Slack (info)
contract events    → indexer-derived    → Alertmanager → PagerDuty + Slack
Vercel metrics     → Vercel webhook    → Slack
Cert expiry        → certbot script    → Slack
Sentry exceptions  → Sentry            → Slack (filtered by tag)
```

Single Alertmanager config in `infra/alertmanager.yml`. Each alert has:
- `severity`: `info | warn | page`
- `route`: `slack-protocol`, `slack-ops`, `pagerduty-oncall`
- `summary`, `description`, `runbook_url`

`runbook_url` points to a section in `OPS/INCIDENT.md` for the responder.

---

## On-call rotation

v1: founder + lead engineer on rotation, 24/7. Page acknowledgement target: 5 min during business hours, 15 min nights/weekends.

v1.5: when team is bigger, formal 1-week rotation with explicit handoffs.

The Rova protocol's RTO (recovery time objective) for indexer outage is 15 minutes; for contract issues, 1 hour (multisig wait).

---

## Synthetic tests

Synthetic probes run every minute:

- `GET https://rova-ashy.vercel.app` → 200 in < 2s
- `GET https://indexer.rova.xyz/health` → 200 in < 500ms
- `POST https://indexer.rova.xyz/api/v1/offerings` → 200 + non-empty result
- A test job lifecycle (using a Rova-controlled agent + robot pair) every 6 hours

Synthetic failure = page on-call.

---

## What we DON'T monitor

- Operator-side resource usage (CPU, RAM) — their host, their problem
- Robot-side anomalies beyond what heartbeats report — operators monitor their own robots
- Agent-side application errors — agents' own observability stack
- Off-chain pre-image storage (operator-managed)

Rova protocol monitors the protocol. Operators monitor their fleets. Agents monitor their agents. Clean separation.

---

## Cost ceiling

Monthly observability budget targets:
- Grafana Cloud: $50/mo
- PagerDuty: $40/mo
- Datadog (synthetic probes): $30/mo
- Sentry: $30/mo
- Total: ~$150/mo

v2 scales linearly with traffic — adds $1/mo per ~100k indexed events. Still cheap relative to revenue at any reasonable scale.

---

## Related

- `OPS/DEPLOY.md` — what's being monitored
- `OPS/INCIDENT.md` — what to do when an alert fires
- `INDEXER.md` § failure modes — indexer-specific
- `ARCH/CONTRACTS.md` — contract architecture
- `DASHBOARD.md` — operator-facing version of monitoring
