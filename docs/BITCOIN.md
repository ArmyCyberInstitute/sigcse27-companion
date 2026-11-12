# Bitcoin laboratory

The published lab runs the course's classroom Bitcoin fork with one instructor station, one student station, Mempool, BTC RPC Explorer, and Chain Graph. The visualization services synchronize their own nodes with the instructor over the Compose network. Only the Nginx gateway publishes a host port.

Open `/labs/bitcoin/`. The student and instructor consoles share the course exercise pager, including the terminal primer, private Regtest, and shared ClassNet. The console divider, chapter menu, previous/next controls, and expected observations belong to that pager. Navigation also links the other published applications.

| Route | Surface |
|---|---|
| `/labs/bitcoin/student/` | Student console and exercises |
| `/labs/bitcoin/instructor/` | Instructor console and exercises |
| `/labs/bitcoin/node-1/` | Instructor terminal alone |
| `/labs/bitcoin/node-2/` | Student terminal alone |
| `/labs/bitcoin/mempool/` | Live blocks, transactions, and fee/mempool visualization |
| `/labs/bitcoin/btc-explorer/` | Bitcoin RPC Explorer |
| `/labs/bitcoin/graph/` | Transaction graph and tracing tools |
| `/labs/bitcoin/student/share/` | Student's published wallet address |

Lab 1 starts an additional private Regtest daemon on the student station using its own data directory and ports. Lab 2 uses the shared ClassNet daemon already running there. The fork has a ten-block coinbase maturity and a two-block difficulty adjustment interval. These classroom rules differ from Bitcoin mainnet.

## Classroom network

The shared ClassNet starts with a small funding balance for the instructor station. Mempool and Explorer show its live chain state. Chain Graph indexes the starting network and displays its indexed height; select **Sync graph** to index later confirmed classroom transactions.

The wallet-sharing pages expose only the published address and wallet page.

## Reset

Recreating only the instructor can allow an old peer to restore the previous chain. Stop all Bitcoin participants before recreating the network:

```sh
docker compose stop bitcoin bitcoin-peer bitcoin-tools bitcoin-graph
docker compose up -d --force-recreate --wait --wait-timeout 900 bitcoin bitcoin-peer bitcoin-tools bitcoin-graph
```

This discards the shared example's wallets and chain state and initializes a fresh ClassNet. The quiz database and other labs are unaffected.

See the [Bitcoin regression playbook](../tests/playbooks/bitcoin.md) for browser and transaction checks.

## Refresh Chain Graph

The Bitcoin nodes synchronize continuously. Chain Graph indexes the chain at startup and when **Sync graph** is selected on either console; it does not rebuild on a timer. The console shows the indexed block height and sync progress. New transfers must be confirmed before they can appear in the graph.

A rebuild waits for peer synchronization and a stable chain tip, then reindexes the confirmed history. Allow at least 30 seconds plus ingestion time on a quiet chain. Graph queries may be unavailable during the rebuild. Repeated sync requests share the current rebuild.

## Persistent terminal sessions

Both consoles run Bash inside Zellij, using the course keyboard configuration. Browser reconnects and console popouts attach to the same station session, preserving panes, tabs, running processes, and shell state. Instructor and student stations have separate sessions.

Zellij starts locked so shell/editor shortcuts work normally. Press `Alt+n` to split a pane; press `Ctrl+G`, then `p` or `t`, for pane or tab controls. Pane and tab actions return to locked mode. Open **Help** for the complete shortcut list.
