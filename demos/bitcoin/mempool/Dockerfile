# ==========================================
# STAGE 1: Rust Builder (Electrs)
# ==========================================
FROM debian:bookworm AS builder-rust
ARG DEBIAN_FRONTEND=noninteractive

# Install Rust build deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    clang cmake pkg-config libssl-dev git curl build-essential ca-certificates

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
ENV PATH="/root/.cargo/bin:${PATH}"

# Build Electrs
RUN git clone --depth 1 https://github.com/mempool/electrs /opt/mempool-electrs \
 && cd /opt/mempool-electrs \
 && cargo build --release \
 && strip target/release/electrs \
 && install -m 0755 target/release/electrs /usr/local/bin/electrs \
 && rm -rf /opt/mempool-electrs /root/.cargo/registry /root/.cargo/git


# ==========================================
# STAGE 2: Node Builder (Mempool & Explorer)
# ==========================================
FROM debian:bookworm AS builder-node
ARG DEBIAN_FRONTEND=noninteractive
ARG MEMPOOL_REF=e8dbba93493860fe150794e0198a6f7cccb77360

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl git python3 build-essential rsync pkg-config libssl-dev ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Install the Rust toolchain version required by rust/gbt.
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain 1.84
ENV PATH="/root/.cargo/bin:${PATH}"

# --- A. Mempool Frontend & Backend ---
WORKDIR /opt/mempool
COPY mempool-basepath.patch /tmp/mempool-basepath.patch
RUN git init . \
 && git remote add origin https://github.com/mempool/mempool.git \
 && git fetch --depth 1 --no-tags origin "${MEMPOOL_REF}" \
 && git checkout --detach FETCH_HEAD \
 && git apply /tmp/mempool-basepath.patch

# 1. Build Frontend (Static Files)
WORKDIR /opt/mempool/frontend
RUN grep -rl "/resources/mining-pools/" src | xargs sed -i 's|/resources/mining-pools/|resources/mining-pools/|g'
RUN npm install && npm run build \
 && rm -rf /opt/mempool/frontend/node_modules /root/.npm

# 2. Build Backend
WORKDIR /opt/mempool/backend
RUN npm run preinstall && npm ci && npm run package \
 && mv /opt/mempool/backend/package/node_modules /opt/mempool/backend/package-node_modules \
 && rm -rf \
    /opt/mempool/backend/node_modules \
    /opt/mempool/backend/dist \
    /opt/mempool/backend/rust-gbt \
    /opt/mempool/rust/gbt/target \
    /opt/mempool/rust/gbt/src \
    /opt/mempool/rust/gbt/.git \
    /root/.npm

# --- B. BTC RPC Explorer ---
RUN npm install --prefix /opt/btc-rpc-explorer -g btc-rpc-explorer
RUN sed -i 's/} else if (global.activeBlockchain == "regtest") {/} else if (getblockchaininfo.blocks === 0 || global.activeBlockchain == "regtest") {/' /opt/btc-rpc-explorer/lib/node_modules/btc-rpc-explorer/routes/baseRouter.js \
 && sed -i 's/} else if (global.activeBlockchain == "regtest") {/} else if (getblockchaininfo.blocks === 0 || global.activeBlockchain == "regtest") {/' /opt/btc-rpc-explorer/lib/node_modules/btc-rpc-explorer/routes/apiRouter.js


# ==========================================
# STAGE 3: Final Runtime
# ==========================================
FROM bitcoin-base

USER root

# Install ONLY runtime dependencies for mempool, db, and nginx.
RUN apt-get update && apt-get install -y --no-install-recommends \
    mariadb-server mariadb-client \
    nginx python-is-python3 supervisor \
    curl ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# --- Copy Electrs ---
COPY --from=builder-rust /usr/local/bin/electrs /usr/local/bin/electrs

# --- Copy Mempool Backend (Artifacts) ---
WORKDIR /opt/mempool/backend
COPY --from=builder-node /opt/mempool/backend/package ./dist
COPY --from=builder-node /opt/mempool/backend/package-node_modules ./node_modules
COPY --from=builder-node /opt/mempool/backend/package.json ./package.json
COPY --from=builder-node /opt/mempool/backend/mempool-config.sample.json ./mempool-config.sample.json

# --- Copy Mempool Frontend (Static) ---
RUN mkdir -p /var/www/
COPY --from=builder-node /opt/mempool/frontend/dist/mempool /var/www/mempool

# --- Copy BTC RPC Explorer ---
COPY --from=builder-node /opt/btc-rpc-explorer /opt/btc-rpc-explorer
RUN ln -s /opt/btc-rpc-explorer/bin/btc-rpc-explorer /usr/local/bin/btc-rpc-explorer

# --- Configuration & Scripts ---
COPY nginx-mempool.conf /etc/nginx/sites-enabled/mempool.conf
RUN rm -f /etc/nginx/sites-enabled/default

COPY mariadb-init.sh /usr/local/bin/mariadb-init.sh
COPY electrs-init.sh /usr/local/bin/electrs-init.sh
COPY btc-rpc-explorer-init.sh /usr/local/bin/btc-rpc-explorer-init.sh
COPY configure-mempool-base-path.sh /usr/local/bin/configure-mempool-base-path.sh
COPY mempool-entrypoint.sh /usr/local/bin/mempool-entrypoint.sh
COPY supervisord.conf /etc/supervisor/conf.d/mempool.conf

RUN chmod +x /usr/local/bin/*.sh

# Setup Environment
ENV BITCOIN_DATADIR="/home/user/.bitcoin" \
    MEMPOOL_NETWORK="mainnet" \
    MEMPOOL_BASE_PATH="/" \
    MEMPOOL_HTTP_PORT="8999" \
    MEMPOOL_BACKEND_MODE="electrum" \
    ELECTRUM_HOST="127.0.0.1" \
    ELECTRUM_PORT="3000" \
    ELECTRUM_TLS_ENABLED="false" \
    CORE_RPC_HOST="127.0.0.1" \
    CORE_RPC_PORT="8332" \
    CORE_RPC_USERNAME="mempool" \
    CORE_RPC_PASSWORD="mempool" \
    CORE_RPC_TIMEOUT="60000" \
    DB_HOST="127.0.0.1" \
    DB_PORT="3306" \
    DB_NAME="mempool" \
    DB_USER="mempool" \
    DB_PASS="mempool" \
    STATS_ENABLED="true"

WORKDIR /home/user

ENTRYPOINT ["/usr/local/bin/mempool-entrypoint.sh"]
CMD ["supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
