#!/bin/sh
# Chain service entrypoint.
#
# Starts a Hardhat node, deploys the contracts (deterministic addresses, so they
# are stable across reboots) and seeds idempotent demo data into Redis. The
# deployment files are written to the shared /app/deployments volume that the
# web container reads. Then it hands the foreground to the node process.
set -e

echo "[chain] starting Hardhat node..."
npx hardhat node --hostname 0.0.0.0 > /tmp/chain.log 2>&1 &
NODE_PID=$!

echo "[chain] waiting for RPC on 8545..."
until node -e "fetch('http://127.0.0.1:8545',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',method:'eth_blockNumber',params:[],id:1})}).then(r=>r.json()).then(()=>process.exit(0)).catch(()=>process.exit(1))" 2>/dev/null; do
  sleep 1
done
echo "[chain] RPC is up."

echo "[chain] deploying contracts..."
npx hardhat run scripts/deploy.cjs --network localhost

echo "[chain] seeding demo data..."
node scripts/seed-demo.cjs || echo "[chain] seed step failed (continuing)"
# Rich demo data so every dashboard list/chart is populated for a walkthrough.
node scripts/seed-demo-rich.cjs || echo "[chain] rich seed step failed (continuing)"

echo "[chain] ready. Handing off to Hardhat node (pid $NODE_PID)."
wait "$NODE_PID"
