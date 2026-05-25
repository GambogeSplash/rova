# OPS/DEPLOY

> How to deploy Rova end-to-end. Marketing site, indexer, contracts, smart-wallet factory, paymaster. The checklist that converts code into a running protocol.

---

## What gets deployed

| Component             | Where                          | Cadence              |
| --------------------- | ------------------------------ | -------------------- |
| Marketing site + dashboard | Vercel                          | per-merge to `main` |
| Indexer worker        | Fly.io (Frankfurt + IAD)        | per-release tag      |
| Postgres (indexer DB) | Fly.io Postgres or Supabase     | one-time + migrations |
| Redis (heartbeat cache) | Fly.io Redis or Upstash         | one-time            |
| MQTT broker           | HiveMQ Cloud (or self-host)     | one-time            |
| Contracts (Base Sepolia) | Foundry deploy from `contracts/` | one-time per address |
| Contracts (Base mainnet) | Foundry deploy (v2)              | one-time per address |
| Paymaster contract    | Same deploy as contracts        | one-time             |
| ROVA token            | Pre-deployed; address pinned    | one-time             |
| Bundler              | Stackup (hosted) or self-host   | one-time config      |

Most of these are one-time. The site + indexer + contracts (on upgrade) are the ongoing ops surface.

---

## Pre-deploy checklist

Before any deploy that touches money:

- [ ] All Foundry tests passing (`forge test`)
- [ ] All UI tests passing (`npm test`)
- [ ] Type check clean (`npm run build` includes tsc)
- [ ] Indexer reducer determinism tests passing
- [ ] Audit checklist for the contract change reviewed (if applicable)
- [ ] Multi-sig signers available (if mainnet)
- [ ] Rollback plan documented

For a UI-only deploy: just the first three.

---

## Site deploy (Vercel)

Auto-deploys on push to `main`. Configured at `vercel.com/team_XH0amrHw2H5fiJhLqmmLlBiw/rova`.

Build steps:
- `npm install` (cached)
- `npm run build` (Next 16 Turbopack)
- Static + dynamic route output

Environment variables (set in Vercel dashboard, encrypted):
```
NEXT_PUBLIC_CHAIN_ID                  84532 (Base Sepolia) / 8453 (mainnet)
NEXT_PUBLIC_INDEXER_URL                https://indexer.rova.xyz
NEXT_PUBLIC_REGISTRY_ADDR              0x...
NEXT_PUBLIC_MARKET_ADDR                0x...
NEXT_PUBLIC_VERIFIER_ADDR              0x...
NEXT_PUBLIC_PAYMASTER_ADDR             0x...
NEXT_PUBLIC_BUNDLER_URL                https://api.stackup.sh/v1/node/...
NEXT_PUBLIC_RPC_URL                    https://sepolia.base.org
SUPABASE_SERVICE_ROLE_KEY              (server-only)
SENTRY_DSN                            (error tracking)
```

Manual deploy (when needed):
```bash
vercel --prod --yes
```

Preview deploys per-PR. Each PR gets a unique URL — useful for design review.

---

## Indexer deploy (Fly.io)

```bash
fly deploy --image rova/indexer:1.0
```

Two regions (`fra` Frankfurt for EU/Africa, `iad` Washington for Americas), one replica per region (more in v2). Postgres is multi-region read replica; writes go to primary.

Environment:
```
DATABASE_URL                postgres://... (primary)
DATABASE_URL_READONLY       postgres://... (replica)
REDIS_URL                   redis://...
MQTT_URL                    mqtts://broker.rova.xyz:8883
RPC_URL_PRIMARY              https://...
RPC_URL_FALLBACK             https://...
START_BLOCK                  14_500_000 (Base Sepolia genesis or close to it)
CHAIN_ID                     84532 / 8453
```

Health check: `GET /health` — returns `{ blocks_behind: number, uptime_s: number }`.

Indexer state is checkpointed every 100 blocks to Postgres + S3. Recovery from cold start re-replays from last checkpoint.

---

## Postgres setup

Schema migrations under `infra/postgres/migrations/`. Applied via `goose`:

```bash
goose -dir infra/postgres/migrations postgres "$DATABASE_URL" up
```

Each migration is forward-only. Down-migrations exist for development convenience but are never run in prod.

Backup: pg_dump nightly to S3, retained 30 days. Recovery tested monthly (chaos engineering practice).

---

## Contracts deploy (Base Sepolia)

```bash
cd contracts/
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast --verify --etherscan-api-key $BASESCAN_KEY
```

The `Deploy.s.sol` script:
1. Reads `.env` for `ADMIN_ADDRESS`, `ROVA_TOKEN_ADDRESS`, `USDC_ADDRESS`, `MIN_STAKE`
2. Deploys `ROVARegistry`
3. Deploys `ROVAVerifier`
4. Deploys `ROVAMarket(usdc, registry, verifier)`
5. Calls `verifier.setMarket(market)` to wire back-ref
6. Sets `registry.setMarketAuthority(market)` so registry accepts slash/completion calls
7. Outputs addresses to `deployments/base-sepolia.json`

The deployments JSON is checked in for transparency; addresses public + verifiable on Basescan.

### Mainnet (v2) deploy

Mainnet contracts are deployed once, owned by a 3-of-5 Safe. Upgrades require multi-sig. Tested against a fork of mainnet for one month before going live.

```bash
forge script script/DeployMainnet.s.sol \
  --rpc-url $BASE_MAINNET_RPC \
  --broadcast \
  --slow \
  --verify \
  --account ledger-signer-1
```

The `--account` flag uses a hardware wallet — no private keys in env.

---

## Paymaster setup

```solidity
ROVAPaymaster paymaster = new ROVAPaymaster(entryPoint);
paymaster.deposit({value: 1 ether});  // funds gas sponsorship
```

The paymaster sponsors gas for:
- Robot smart-wallet creation
- Robot `submitProof` calls
- Robot `publishHeartbeat` calls

NOT sponsored:
- Operator's signed actions (operator pays their own gas)
- Agent's signed actions (agent pays their own gas)

Funds the paymaster from protocol fees (the 0.3% accumulated in `ROVAMarket`). Drain check: paymaster needs ~0.5 ETH minimum at all times; alert at < 1 ETH; auto-top-up at < 0.5 ETH via a keeper.

---

## Bundler

v1 uses Stackup hosted bundler. Endpoints configured per-chain in `NEXT_PUBLIC_BUNDLER_URL`.

v2 explores bundler diversity:
- Stackup (primary)
- Pimlico (fallback)
- Self-hosted Skandha (optional, for operators with strict requirements)

The SDK picks the first available; failures cascade to the next.

---

## DNS + TLS

```
rova.xyz                 → Vercel (marketing + dashboard)
indexer.rova.xyz         → Fly.io load balancer (indexer)
broker.rova.xyz          → HiveMQ MQTT broker
docs.rova.xyz            → Vercel (subdomain of marketing, /docs route)
api.rova.xyz             → Vercel (API edge functions)
```

TLS via Let's Encrypt (auto-renewed). Cert pinning fingerprints published at `https://rova.xyz/.well-known/cert-pins.json` so SDK and CLI tools can verify.

---

## Rollback plan

| Component      | Rollback path                                                |
| -------------- | ------------------------------------------------------------ |
| Vercel site    | Promote previous deployment from Vercel UI (one click)        |
| Indexer        | `fly deploy --image rova/indexer:<prev>` (one command)        |
| Postgres schema| `goose down` (development only); for prod, hot-fix forward    |
| Contracts      | Upgrade-proxy to previous logic (multisig); requires audit    |
| Paymaster      | Disable + re-deploy (no in-flight UserOps depend on it)       |

Rollback time goal: < 15 minutes for site or indexer, < 1 hour for contracts (multisig delay).

---

## Monitoring + alerts

See `OPS/MONITORING.md` for the full alert list. Quick reference:

- Vercel: build failures → Slack
- Indexer: > 30s lag → PagerDuty
- Contract: > 1% of jobs failing → PagerDuty
- Paymaster: < 0.5 ETH → Slack + auto-top-up
- Cert near expiry: < 14d → Slack
- DB connection pool exhausted: → PagerDuty

---

## Disaster recovery drills

Quarterly chaos tests:
- Kill indexer worker; measure time to detect + restart
- Drop Postgres replication; measure replica lag remediation
- Block one RPC provider; measure fallback latency
- Simulate paymaster drain; verify alert fires + top-up runs

Documented run-books in `infra/runbooks/`.

---

## Self-hosted deployments

Operators with strict data-residency or sovereignty requirements can run the indexer themselves:

```bash
git clone github.com/rova-protocol/indexer
docker compose up -d
```

The Docker compose includes Postgres + Redis + indexer. Configured via `.env` — point at the public Base RPC + the public MQTT broker (or self-host that too).

Self-hosting forfeits the protocol's hosted SSE convenience. Operators trade convenience for full data ownership.

---

## Related

- `OPS/MONITORING.md` — alerts + dashboards
- `OPS/INCIDENT.md` — playbooks for the alerts
- `INDEXER.md` — indexer architecture
- `ARCH/CONTRACTS.md` — contract dependency graph
- `BIZ/OPEN-SOURCE.md` — licensing for the self-hostable parts
