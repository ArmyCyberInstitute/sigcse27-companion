# Chain Graph architecture

Chain Graph indexes a snapshot of the shared classroom chain and serves address searches, transaction details, counterparties, clusters, and paths.

## Services

The container runs its own Bitcoin node, Neo4j Community, a FastAPI application, and the ingestion script. Its node synchronizes continuously with the instructor station over the Compose network. Neo4j's HTTP and Bolt listeners bind to the container's loopback interface. The gateway exposes the application under `/labs/bitcoin/graph/`.

The browser uses Cytoscape.js to lay out the graph and display clustering, transaction timing, and OP_RETURN annotations. Queries use bounded expansion so the browser can explore a portion of the graph at a time.

## Index lifecycle

At startup, the node synchronizes and the ingestion script builds the graph. The graph index does not refresh on a timer. Later confirmed transfers enter the index after another rebuild.

Choose **Sync graph** on either Bitcoin console to request a rebuild through `POST /labs/bitcoin/graph/api/sync`. Concurrent requests share the current job. The console displays progress and the indexed block height, polling status every three seconds; the graph viewer polls status every five seconds. These status polls do not rebuild the index.

The rebuild waits for the local node to catch up and checks for a stable tip before replacing the graph store. A quiet chain normally needs at least 30 seconds for the stability checks, followed by database startup and ingestion. If mining continues, the stability wait can reach ten minutes. The finished graph reports the height captured when ingestion began. Queries can temporarily return unavailable responses during rebuilding.

## Teaching workflow

Publish a classroom address, make a transfer, and confirm it in a block. Sync the graph, open that address in Chain Graph, and inspect its neighboring transactions. Compare the graph's indexed height with Mempool or Explorer before tracing recent activity.

See [Bitcoin deployment details](../../docs/BITCOIN.md) and the [regression playbook](../../tests/playbooks/bitcoin.md).
