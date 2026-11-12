# Ethereum

Open `/labs/ethereum/` in a fresh browser context. Check the runtime configuration, selected wallet, chain connection, and deployed contract addresses.

1. Create a wallet from the sidebar while a lab is open. Save/close the credentials dialog and verify that the new wallet is selected. Complete the mining top-off challenge and confirm the credited ETH.
2. Open **FT Arcade Lab**. Buy one ARC; confirm a successful receipt and a one-token increase. Approve the vault, burn one ARC for a game, and verify the token decrease and issued pass.
3. Launch the game, play a round, and confirm its score transaction appears in the high-score cache. Try changing the score payload or reusing the same pass for a different score; the backend or contract must reject it.
4. Open **Tokenization Lab**. Claim a theme, mint its NFT batch, verify ownership, then open **NFT Marketplace**, list a token, and buy it from a second wallet. Check the ownership transfer and marketplace state.
5. Open **Smart Contract Lab**. Compile, deploy, and interact with a small supported contract. Confirm the receipt and resulting stored value.
6. Open **Beacon Chain Lab**. Confirm that the simulated chain progresses and finalized state changes. Join a validator role and complete its displayed duty.
7. Open **Lab Terminal** and run a real command through the browser terminal. Check Diagnostics and confirm no unexplained RPC or asset failures remain.

The automated arcade test uses the actual purchase, approval, burn, and signed-pass flow. It supplies a representative client-completion event to test score storage; this checks the client-attested score pipeline, and does not establish that a human can finish the game. Manual gameplay is a separate check.

The extended suite completes an NFT sale between two browser-created wallets and checks ownership and payment. It also edits and deploys a contract, writes and reads its value, joins and attests as a validator, and plays Block Breaker through normal controls until the round ends. Pass recovery, completion, multiple-session display, fractional ARC rejection, whole-token transfer, controlled frontend expiry, and mobile layout have dedicated checks. Backend expiry and token/session boundaries are checked separately by the pass API tests.
