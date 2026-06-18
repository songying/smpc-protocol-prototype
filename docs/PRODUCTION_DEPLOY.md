# Production Deployment (public internet)

This brings the full SMPC prototype up on a fresh VPS behind automatic HTTPS with
a single command. Architecture:

```
            ┌─────────────┐   HTTPS (Let's Encrypt)
 Internet ──▶│   Caddy     │  :80 / :443  (only published ports)
            └─────┬───────┘
                  │ reverse proxy
            ┌─────▼───────┐
            │   web       │  Next.js (UI + API), standalone build
            └─┬───┬───┬───┘
              │   │   └────────────▶ smpc-node1 / node2 / node3  (Shamir compute)
              │   └────────────────▶ smpc-chain (Hardhat + contracts, deterministic)
              └────────────────────▶ smpc-redis (datastore, AOF persistence)
```

Everything except Caddy is reachable only on the internal Docker network.

## What's live vs simulated

- **Live:** data registration on-chain, secure aggregation across 3 nodes
  (Shamir t=2, n=3 — nodes only ever see shares), on-chain fee settlement
  enforcing the **70 / 25 / 4 / 1** split. Verifiable via real tx hashes.
- **Simulated (clearly labelled in the UI):** the ZK-proof and FHE computation
  paths. This matches the thesis non-claims — the prototype is a vertical slice,
  not a production cryptosystem.

## Prerequisites

- A Linux VPS (2 vCPU / 4 GB RAM is plenty) with Docker + Docker Compose v2.
- A domain name with a DNS **A record** pointing at the VPS public IP.
- Inbound TCP 80 and 443 open in the firewall / security group.

## Deploy

```bash
# 1. Clone
git clone <repo-url> smpc-protocol && cd smpc-protocol

# 2. Configure
cp .env.prod.example .env.prod
#    edit DOMAIN and ACME_EMAIL in .env.prod
./scripts/gen-secrets.sh >> .env.prod      # appends JWT/ENCRYPTION/SESSION secrets

# 3. Launch (builds images on first run)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# 4. Watch it come up
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f smpc-chain   # waits for "ready"
```

Within ~1–2 minutes the chain deploys the contracts and seeds demo data, the web
container goes healthy, and Caddy provisions a certificate. Visit
`https://your-domain.com` and open **Live Demo**.

## Verify

```bash
# All services healthy
docker compose -f docker-compose.prod.yml ps

# End-to-end live slice (registration + 3-node SMPC + on-chain settlement)
curl -s https://your-domain.com/api/demo/run -X POST \
     -H 'content-type: application/json' -d '{"operation":"mean"}' | jq

# Expect: registration.txHash, aggregation.live=true with 3 node partials,
# settlement.breakdown = 70/25/4/1 of the total.
```

## Notes & limitations

- **Chain persistence:** the Hardhat node holds state in memory. Contract
  addresses are deterministic and the seed is idempotent, so addresses and demo
  data are stable across restarts; ad-hoc demo transactions reset if the
  `smpc-chain` container is recreated. The shared `deployments` volume keeps the
  web container's addresses/ABIs in sync.
- **Secrets:** never commit `.env.prod`. The default `SERVER_PRIVATE_KEY` is the
  public Hardhat account #0 — safe only on the bundled local chain.
- **Bare IP / no domain:** set `DOMAIN=:80` (plain HTTP) or `DOMAIN=localhost`
  (Caddy self-signed) in `.env.prod`. Browsers will warn on self-signed certs.
- **Local smoke test:** the same stack runs locally with `DOMAIN=localhost`.

## Operations

```bash
# Logs
docker compose -f docker-compose.prod.yml logs -f web

# Update to latest code
git pull && docker compose -f docker-compose.prod.yml up -d --build

# Tear down (keep volumes)        / wipe everything
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml down -v
```
