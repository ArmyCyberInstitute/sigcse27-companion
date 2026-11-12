# Lab regression playbooks

These playbooks accompany the automated workflows in [functional.cjs](../functional.cjs). They follow the original course's two-stage regression model: automated application checks followed by a browser review from the learner's perspective.

Run against a disposable local deployment:

```sh
docker compose up --build -d --wait --wait-timeout 900
npm --prefix tests ci
tests/node_modules/.bin/playwright install chromium
npm --prefix tests run test:ethereum-contracts
npm --prefix tests run test:bitcoin-terminal
npm --prefix tests run test:functional
npm --prefix tests run test:ethereum-api
npm --prefix tests run test:ethereum-extended
```

Set `BASE_URL` for a different host. `FUNCTIONAL_LABS=ethereum` runs one workflow; comma-separated names select several. Available names: `bitcoin`, `ethereum`, `cryptography`, `quiz`.

The Solidity contract suite uses the local Compose Ethereum service and an isolated Hardhat network. It does not connect to `BASE_URL` or change the deployed lab chain.

The suite creates synthetic wallets, mines blocks, submits transactions, and publishes a three-question quiz. It does not reset the stack. Reuse that same deployment for the browser review. Reset only when a test requires a clean chain or when the environment cannot be recovered; record the reason.

Each lab runs in a fresh browser context. Results, Playwright traces, and failure screenshots go to `/tmp/companion-functional-evidence`; `TEST_ARTIFACTS_DIR` changes that location. Do not place runtime evidence in the source archive.

## Browser review

- [Bitcoin](bitcoin.md)
- [Ethereum](ethereum.md)
- [Cryptography](cryptography.md)
- [Quiz builder](quiz.md)

For every failure, record the route, action, expected result, observed result, console errors, failed requests, and a screenshot. Record the image/build revision and whether the run reused or recreated containers. An HTTP 200 response or a populated screen is insufficient evidence of a completed teaching workflow.

Browser agents may follow the same steps as a human reviewer. Preserve the learner's route: type terminal commands through the browser terminal, submit forms through their visible controls, and check resulting state. Server-side queries can corroborate a result; identify them separately from browser evidence. Report failures and untested steps explicitly.

The standalone publication uses fixed shared examples. The original course's authentication, lane allocation, fleet resets, and private instructor credential files are outside this workflow.
