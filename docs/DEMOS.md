# Demonstrations

Run `docker compose up` from the repository root, then open http://localhost:8080. All examples are shared, and application state is visible to other viewers of the same deployment.

## Cryptography

Open `/labs/cryptography/`. Complete a weak-hash collision, compare SHA-256 digests after a one-character change, build a Merkle tree and verify a proof, then complete the symmetric/asymmetric scenarios. The app’s included instructions explain its teaching simulation.

## Bitcoin

Open `/labs/bitcoin/` for the student console and exercise pager. Switch to **Instructor console** for the instructor station; **Mempool**, **Explorer**, and **Chain Graph** open the visualization tools. The primer, Regtest, and ClassNet exercises are available from the pager.

The shared classroom chain initializes at startup. Follow the displayed exercises for mining, wallets, published addresses, peer transfers, and tracing. [Bitcoin deployment details](BITCOIN.md) describe the topology and reset sequence.

## Ethereum

Open `/labs/ethereum/`. The image includes a local Hardhat chain, frontend, terminal, contracts, and a teaching PoS simulation. Create or select a wallet and complete its ETH top-off exercise. In **FT Arcade Lab**, buy ARC, approve the vault, and burn ARC for a signed game pass. **Tokenization Lab** provides NFT minting and ownership checks. **Smart Contract Lab** supports compilation, deployment, and interaction. **Beacon Chain Lab** exposes validator duties, proposals, attestations, and finality. The [Ethereum playbook](../tests/playbooks/ethereum.md) describes the complete browser review. This is a teaching model, not a production Ethereum consensus client. Fresh addresses and contract state are generated at startup.

## Quiz engine

Open `/quiz/instructor/`. The three example banks load automatically at startup. Create a template selecting a sample lesson, generate a quiz, edit a question, and publish it. Use a private browser window at `/quiz/student/` to enroll a synthetic student and submit an attempt. Return to the instructor view to grade and export results. Instructor access uses a shared demonstration context without a login page.

## Stop and reset

`docker compose down` stops this collection. Add `-v` only to intentionally remove its quiz database. Bitcoin and Ethereum state lives in their containers in this standalone configuration and resets on container recreation.

## Run the bundled checks

The quiz engine tests run against the sample banks:

```sh
python3 -m venv /tmp/companion-tests
/tmp/companion-tests/bin/pip install -r demos/quiz-engine-v2/requirements.txt
make quiz-bundle
PYTHONPATH=demos/quiz-engine-v2 QUIZ_ENGINE_SAMPLE_QUIZ_DIR="$PWD/quizes" /tmp/companion-tests/bin/python -m pytest demos/quiz-engine-v2/tests -q
```

After starting the collection, copy the Ethereum source tests into the running image and execute the contract suite:

```sh
docker compose exec ethereum mkdir -p /app/test
docker compose cp demos/ethereum_lab/test/. ethereum:/app/test/
docker compose exec ethereum npx hardhat test
```

## Reset a shared example

Use `docker compose up -d --force-recreate crypto`, `docker compose up -d --force-recreate ethereum`, or the Bitcoin reset sequence in [Bitcoin deployment details](BITCOIN.md) to reset the corresponding ephemeral teaching environment. This interrupts that example for every viewer while leaving the other services running. `docker compose down -v` resets the entire collection, including the quiz database; sample banks load again at the next start.
