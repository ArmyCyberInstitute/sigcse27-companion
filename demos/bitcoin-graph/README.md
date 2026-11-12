# Chain Graph explorer

Chain Graph visualizes confirmed transactions on the shared classroom Bitcoin chain. Enter an address to explore transfers, co-spend clusters, time ranges, value filters, OP_RETURN metadata, and transaction details.

Start the public demonstration from the repository root:

```sh
docker compose up --build -d
```

Open `/labs/bitcoin/graph/` directly or select **Chain Graph** from either Bitcoin console. The public demonstration enables the graph for all viewers.

## Refresh the index

The Bitcoin node synchronizes continuously with its peers. The graph indexes a snapshot at startup and remains at that height until rebuilt. Select **Sync graph** on the Bitcoin lab page to include newly confirmed activity. The page shows progress and the indexed block height. Concurrent requests share one rebuild.

A rebuild waits for a stable chain tip, restarts the graph database, and ingests the confirmed history. On a quiet chain, allow at least 30 seconds plus ingestion time. Queries can be temporarily unavailable while rebuilding.

## Components

| File | Purpose |
| --- | --- |
| `graph-entrypoint.sh` | Start the local Bitcoin peer and enable the public graph |
| `graph-rebuild` | Replace the graph index with a snapshot of the current chain |
| `etl.py` | Ingest confirmed transactions into Neo4j |
| `app/main.py` | Serve queries, status, and the sync endpoint |
| `app/static/` | Lay out the graph in the browser using Cytoscape.js |
| `supervisord.conf` | Run Neo4j, the API, and the initial index build |

The graph service uses container-local storage. Recreating it discards that node's data and rebuilds the index from its classroom peer. See [DESIGN.md](DESIGN.md) for the index lifecycle and query limits.
