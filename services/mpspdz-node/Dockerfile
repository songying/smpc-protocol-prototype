# SMPC compute node — real MP-SPDZ (shamir-party.x) party + JS fallback server.
#
# Multi-stage: the builder compiles MP-SPDZ from source (and precompiles our
# client-IO programs + dev certs); the slim glibc runtime keeps only the binary,
# its shared libs, the compiled bytecode, the certs, plus the Node.js fallback.
#
# arm64/x86 both build (the vendored sse2neon shim trips -Werror, so we drop it).

# ---- builder: compile MP-SPDZ + programs + dev certs ----
FROM ubuntu:22.04 AS mpspdz-build
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    automake build-essential clang cmake git libboost-dev libboost-thread-dev \
    libgmp-dev libntl-dev libsodium-dev libssl-dev libtool python3 ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /opt
RUN git clone --depth 1 https://github.com/data61/MP-SPDZ.git
WORKDIR /opt/MP-SPDZ
# -Werror trips on the arm sse2neon shim; setup serially to avoid submodule git races
RUN sed -i 's/-Werror//g' CONFIG && make setup && make -j"$(nproc)" shamir-party.x
# precompile our client-IO programs. Written inline (kept in sync with the repo
# copies at services/mpspdz-node/Programs/Source/*.mpc) to avoid a macOS
# case-insensitive build-context COPY mismatch on the Linux daemon.
RUN mkdir -p Programs/Source && printf '%s\n' \
  'from Compiler.types import sint' \
  'PORTNUM = 14000' \
  'N = 10' \
  'listen_for_clients(PORTNUM)' \
  'socket = accept_client_connection(PORTNUM)' \
  'values = sint.receive_from_client(N, socket)' \
  'total = sint(0)' \
  'for i in range(N):' \
  '    total = total + values[i]' \
  'sint.reveal_to_clients([socket], [total])' \
  'closeclientconnection(socket)' \
  > Programs/Source/agg_sum.mpc \
 && printf '%s\n' \
  'from Compiler.types import sint' \
  'PORTNUM = 14000' \
  'N = 10' \
  'listen_for_clients(PORTNUM)' \
  'socket = accept_client_connection(PORTNUM)' \
  'values = sint.receive_from_client(N, socket)' \
  'total = sint(0)' \
  'sumsq = sint(0)' \
  'for i in range(N):' \
  '    total = total + values[i]' \
  '    sumsq = sumsq + values[i] * values[i]' \
  'sint.reveal_to_clients([socket], [total, sumsq])' \
  'closeclientconnection(socket)' \
  > Programs/Source/agg_variance.mpc \
 && printf '%s\n' \
  'from Compiler.types import sint' \
  'PORTNUM = 14000' \
  'N = 10' \
  'listen_for_clients(PORTNUM)' \
  'socket = accept_client_connection(PORTNUM)' \
  'ab = sint.receive_from_client(2 * N, socket)' \
  'total = sint(0)' \
  'for i in range(N):' \
  '    total = total + ab[i] * ab[N + i]' \
  'sint.reveal_to_clients([socket], [total])' \
  'closeclientconnection(socket)' \
  > Programs/Source/agg_dotproduct.mpc \
 && python3 ./compile.py agg_sum \
 && python3 ./compile.py agg_variance \
 && python3 ./compile.py agg_dotproduct
# dev TLS certs (NON-PRODUCTION): parties P0-P2 + client C0, shared by all nodes (same image)
RUN ./Scripts/setup-ssl.sh 3 && ./Scripts/setup-clients.sh 1

# ---- runtime: glibc + Node.js + MP-SPDZ binary/libs/bytecode/certs + JS app ----
FROM node:18-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgmp10 libgmpxx4ldbl libsodium23 libssl3 openssl dumb-init wget \
 && rm -rf /var/lib/apt/lists/*

# JS deps + app (the fallback server + /mpc-run launcher)
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .

# MP-SPDZ runtime artifacts — keep the /opt/MP-SPDZ paths so the binary rpath resolves
COPY --from=mpspdz-build /opt/MP-SPDZ/shamir-party.x /opt/MP-SPDZ/
COPY --from=mpspdz-build /opt/MP-SPDZ/libSPDZ.so /opt/MP-SPDZ/
COPY --from=mpspdz-build /opt/MP-SPDZ/local/lib/libboost_filesystem.so.1.83.0 /opt/MP-SPDZ/local/lib/
COPY --from=mpspdz-build /opt/MP-SPDZ/local/lib/libboost_iostreams.so.1.83.0 /opt/MP-SPDZ/local/lib/
COPY --from=mpspdz-build /opt/MP-SPDZ/Programs /opt/MP-SPDZ/Programs
COPY --from=mpspdz-build /opt/MP-SPDZ/Player-Data /opt/MP-SPDZ/Player-Data
COPY --from=mpspdz-build /opt/MP-SPDZ/Scripts /opt/MP-SPDZ/Scripts
COPY --from=mpspdz-build /opt/MP-SPDZ/ExternalIO /opt/MP-SPDZ/ExternalIO

ENV MPSPDZ_HOME=/opt/MP-SPDZ NODE_ENV=production NODE_PORT=9999
# 9999 = JS API; 5000 = inter-party base; 14000+i = client-IO ports
EXPOSE 9999 5000 5001 5002 14000 14001 14002

# Entrypoint publishes the dev certs + ExternalIO client to the shared volume so
# the web container's external client can connect (same CA across parties+client).
RUN printf '%s\n' \
  '#!/bin/sh' \
  'set -e' \
  'SHARED="${MPSPDZ_SHARED:-/mpspdz-shared}"' \
  '# Only party 0 publishes the dev certs (avoids a multi-node write race); clear' \
  '# first so a rebuild refreshes the certs instead of nesting/keeping stale ones.' \
  'if [ -d "$SHARED" ] && [ "${NODE_INDEX:-0}" = "0" ]; then' \
  '  rm -rf "$SHARED/Player-Data" "$SHARED/ExternalIO" 2>/dev/null || true' \
  '  cp -rf /opt/MP-SPDZ/Player-Data "$SHARED"/ 2>/dev/null || true' \
  '  cp -rf /opt/MP-SPDZ/ExternalIO "$SHARED"/ 2>/dev/null || true' \
  '  chmod -R a+rX "$SHARED" 2>/dev/null || true' \
  'fi' \
  'exec node src/index.js' \
  > /usr/local/bin/node-entrypoint.sh && chmod +x /usr/local/bin/node-entrypoint.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:9999/status >/dev/null 2>&1 || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node-entrypoint.sh"]
