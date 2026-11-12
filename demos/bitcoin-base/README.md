# Bitcoin classroom runtime

This image contains the course's custom Bitcoin Core fork, a non-privileged Linux workstation, Python Bitcoin tools, and a browser terminal built with ttyd and Zellij. The classroom chain has a custom genesis block, ten-block coinbase maturity, and a two-block difficulty adjustment interval.

## Start the public demonstration

From the repository root:

```sh
docker compose up --build
```

Open http://localhost:8080/labs/bitcoin/. The student and instructor consoles connect to separate stations on the same classroom chain. The root Compose configuration also starts Mempool, Explorer, and Chain Graph. See [Bitcoin deployment details](../../docs/BITCOIN.md).

## Terminal sessions

Each station has a persistent Zellij session named `bitcoin`, using the course keyboard configuration. Reconnecting, hiding the console, or opening its popout attaches to that same session. Tabs, panes, shell variables, and foreground processes survive browser disconnects. Station sessions are independent.

Zellij starts locked so shell and editor shortcuts pass through. Use `Alt+n` for a new pane or `Ctrl+G`, then `p` or `t`, for pane or tab controls. Pane and tab actions return to locked input. The console's **Help** panel lists the shortcuts.

## Runtime paths and configuration

| Setting | Purpose |
| --- | --- |
| `/home/user/.bitcoin` | Shared-chain node data and wallets |
| `/home/user/share` | Published wallet page, address, and public exercise catalog |
| `/etc/zellij/config.kdl` | Course terminal keyboard and session configuration |
| `BITCOIN_DATADIR` | Override the node data directory |
| `BITCOIN_REGTEST` | Start the station daemon in Regtest mode when set to `1` |
| `BITCOIN_EXTRA_ARGS` | Additional daemon arguments |
| `SEED_HOSTS` | Classroom peers to connect to |
| `INIT_CLASSNET` | Initialize the public classroom funding chain on a fresh instructor station |
| `AUTO_WALLET` | Optionally create and load the configured wallet |
| `AUTO_SCAN` | Enable subnet peer discovery; disabled by the public Compose deployment |

Browser reconnection preserves Zellij state. Container recreation replaces container-local storage unless that storage is backed up or mounted separately. Assessment evidence, case generators, and instructor answer bundles are outside this runtime.
