#!/bin/sh
# Generate strong production secrets for the SMPC stack.
# Usage:  ./scripts/gen-secrets.sh >> .env.prod
set -e

gen() { openssl rand -hex "$1"; }

echo "# --- generated secrets ($(date -u +%Y-%m-%dT%H:%M:%SZ)) ---"
echo "JWT_SECRET=$(gen 32)"
echo "ENCRYPTION_KEY=$(gen 16)"   # 32 hex chars
echo "SESSION_SECRET=$(gen 32)"
