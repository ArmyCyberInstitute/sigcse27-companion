# --- STAGE 1: Build ---
FROM debian:bookworm AS builder
ARG DEBIAN_FRONTEND=noninteractive
ARG TARGETARCH
ARG TTYD_VERSION=1.7.7
ARG ZELLIJ_VERSION=0.45.1

# Added ca-certificates for git clone and libssl-dev for the build
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake pkgconf git patch wget curl \
    ca-certificates libssl-dev \
    libgmp3-dev libevent-dev libboost-dev libsqlite3-dev \
    libcapnp-dev capnproto libzmq3-dev \
    python3 python3-venv python3-pip python3-dev

COPY patches/custom-genesis.patch /custom-genesis.patch
COPY build-bitcoin.sh /build-bitcoin.sh

# The script should now be able to clone via HTTPS
RUN bash /build-bitcoin.sh && \
    strip /usr/local/bin/bitcoin* /usr/local/bin/bitcoind

RUN case "${TARGETARCH}" in \
      amd64) BIN_ARCH="x86_64" ;; \
      arm64) BIN_ARCH="aarch64" ;; \
      *) echo "Unsupported TARGETARCH: ${TARGETARCH}" >&2; exit 1 ;; \
    esac && \
    wget -q "https://github.com/tsl0922/ttyd/releases/download/${TTYD_VERSION}/ttyd.${BIN_ARCH}" -O /ttyd && \
    chmod +x /ttyd && \
    wget -q "https://github.com/zellij-org/zellij/releases/download/v${ZELLIJ_VERSION}/zellij-${BIN_ARCH}-unknown-linux-musl.tar.gz" \
      -O /tmp/zellij.tar.gz && \
    tar xzf /tmp/zellij.tar.gz -C /usr/local/bin && \
    rm /tmp/zellij.tar.gz && \
    chmod +x /usr/local/bin/zellij

RUN python3 -m venv /opt/venv \
 && /opt/venv/bin/pip install --no-cache-dir --upgrade pip setuptools wheel \
 && /opt/venv/bin/pip install --no-cache-dir python-bitcoinlib bitcoinlib

# --- STAGE 2: Final (The Slim Image) ---
FROM debian:bookworm-slim
ARG DEBIAN_FRONTEND=noninteractive

# Added ca-certificates and libssl3 for runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates libssl3 \
    libevent-extra-2.1-7 \
    libevent-pthreads-2.1-7 \
    libboost-filesystem1.74.0 \
    libboost-thread1.74.0 \
    libsqlite3-0 \
    libzmq5 \
    libgmp10 \
    libcapnp-0.9.2 \
    python3 python3-venv python3-pip \
    tmux screen procps jq curl netcat-openbsd iproute2 nano \
    vim emacs less socat \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/bin/zellij /usr/local/bin/zellij
COPY --from=builder /usr/local/bin/bitcoin* /usr/local/bin/
COPY --from=builder /usr/local/bin/bitcoind /usr/local/bin/
COPY --from=builder /ttyd /usr/local/bin/ttyd

COPY zellij-config.kdl /etc/zellij/config.kdl

# 3. Setup User and Environment
RUN useradd -m user && echo "user:password" | chpasswd
WORKDIR /home/user/

COPY --chown=user:user agent.py miner.py ./scripts/
COPY --chown=user:user forensics/ /opt/forensics/
COPY --chmod=755 entrypoint.sh peer-discovery.sh /usr/local/bin/

COPY --from=builder /opt/venv /opt/venv

RUN echo "source /opt/venv/bin/activate" >> /home/user/.bashrc && \
    command -v ttyd && ttyd --version && \
    command -v zellij && zellij --version

USER user

ENV BITCOIN_DATADIR="/home/user/.bitcoin" \
    HOME="/home/user" TERM="xterm-256color" USER="user" SHELL="/bin/bash" \
    PATH="/opt/venv/bin:$PATH" \
    ZELLIJ_CONFIG_DIR="/etc/zellij"

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["ttyd", "-W", "zellij", "attach", "--create", "bitcoin"]
