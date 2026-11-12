# Blockchain Terminal Learning Objectives

**Instructions:**

Upon completion of this two-week (80 hour) course on blockchain fundamentals, students will demonstrate subject-matter proficiency by successfully performing the following tasks:

| **#** | **Terminal Learning Objective** | **Key References & Learning Activites** |
| :-: | :-------------| :----- |
| 1 | Real-World Motivation: Describe the real-world problems that led to Bitcoin and later blockchains—lack of trust, single-point failure, censorship. Give three concrete examples where decentralization adds value. | Cypherpunk Manifesto; Bitcoin white paper §1; class ice-breaker Q&A. |
| 2 | Cryptographic Tools: Identify and match the essential cryptographic tools (hashes, symmetric & public keys, digital signatures, Merkle trees) to the security properties they provide in a ledger. | IntenseCrypto Lectures 0–8, 10–11; drag-and-drop quiz. |
| 3 | Consensus & Attacks: Outline how peer-to-peer networks and basic consensus (Proof-of-Work, Proof-of-Stake) reach agreement. Name two common attacks such as 51% or Sybil. | Chord / Pastry & Sybil papers; white-board walkthrough. |
| 4 | Hyperledger Fabric Test Network: Deploy and operate a three-peer Hyperledger Fabric node network. Submit a transaction and verify it in the ledger state. | | Hyperledger Fabric documentation, lab guide; graded CLI lab. |
| 5 | Bitcoin vs Ethereum: Compare Bitcoin’s UTXO model with Ethereum’s account + gas model. List one clear strength and one limitation of each platform. | Nakamoto paper §2–5; *Mastering Ethereum* ch. 1–4; worksheet. |
| 6 | Smart Contracts in Fabric: Create and invoke a simple Hyperledger Fabric smart contract (chaincode). Record an asset transfer and enforce a basic business rule. | Fabric chaincode template; capstone lab project. |
| 7 | Applications & Controversies: Summarize two meaningful applications (e.g., supply-chain audit, identity). Summarize two controversies or challenges (e.g., energy use, ransomware). | DAO-hack article; CBDC & Red Belly papers; guided group discussion. |


## Essential Guiding Questions

### Section I. Introduction to Blockchain
- Why do trust, censorship, and single-point-of-failure issues motivate a new model for digital transactions?
- What distinguishes a blockchain from a traditional database or log file?
- How do distributed consensus, hashing, peer-to-peer networking, and incentives fit together at a high level?
- Which real-world problems—cross-border payments, auditable supply chains, digital identity—are early blockchains trying to solve?
- How have cryptography, distributed computing, and P2P file-sharing converged into modern blockchain systems?
- What do blockchain advocates promise socially, politically, and economically—and where has reality met or missed those promises?
- In what ways can blockchain reduce reliance on central intermediaries while introducing new risks?
- How have Bitcoin and Ethereum shaped the public perception of blockchain technologies?
- What lessons can we draw from earlier electronic-cash and P2P experiments (e.g., e-gold, Napster, BitTorrent)?
- Why is a clear understanding of blockchain fundamentals critical for today’s cyber-operations professionals?

### Section II. Blockchain Foundations
- Which three technology pillars—cryptography, peer-to-peer networking, and distributed consensus—must cooperate for any blockchain to function?
- How do hash functions, public-key pairs, and digital signatures work together to secure a block’s contents?
- Why does every secure ledger depend on high-quality pseudorandom number generation?
- When do we choose block ciphers over stream ciphers (and vice-versa) in ledger protocols or wallet software?
- How do Merkle trees let a tiny root prove integrity for gigabytes of data?
- What breaks if a foundational primitive (e.g., SHA-1, small RSA keys) is compromised, and how can chains migrate?
- How do client-server and peer-to-peer architectures differ in failure modes and resilience?
- Why is reputation (PeerTrust, EigenTrust) important when nodes have no shared certificate authority?
- How does Proof-of-Work translate electricity into voting power, and what contrasting trade-offs does Proof-of-Stake introduce?
- Which attack classes—51%, Sybil, network delay—most threaten consensus, and what design patterns mitigate them?

### Section III. Digital Assets & Cryptocurrencies
- How do distributed ledgers differ from conventional replicated databases in trust assumptions?
- What makes Bitcoin’s UTXO model fundamentally different from Ethereum’s account-plus-gas model?
- Why are mining fees (Bitcoin) and gas (Ethereum) central to network security and spam prevention?
- How does tokenization turn on-chain records into representations of off-chain value?
- What technical properties distinguish fungible tokens from non-fungible tokens (NFTs)?
- How do smart contracts automate asset logic, and what common bugs undermine them?
- Which network-layer or economic attacks (double-spend, eclipse, balance) still threaten public cryptocurrencies?
- How can permissioned platforms like Hyperledger Fabric deliver blockchain benefits inside enterprises or government coalitions?
- What motivates privacy-focused coins, stablecoins, and central-bank digital currencies, and what trade-offs do they accept?
- How do regulatory and compliance frameworks (KYC, AML) interact with decentralized digital-asset systems?

### Section IV. Blockchain Today, Challenges & Policy
- Which production-grade applications (supply-chain audit, identity, DeFi) show measurable value today?
- How do Layer-2 solutions, sharding, or alternative consensus mechanisms aim to solve the scalability–security–decentralization trilemma?
- Where have decentralized autonomous organizations (DAOs) succeeded or failed in real governance scenarios?
- What ethical and economic debates surround cryptocurrency as a store of value versus speculative asset?
- How does Proof-of-Work energy consumption compare with Proof-of-Stake and other emerging models?
- How are central-bank digital currencies reshaping national monetary policy and geopolitical strategy?
- In what ways do criminals exploit pseudonymity, mixers, or tumblers, and how can forensic analysts respond?
- What environmental and social impacts arise from large-scale mining or validator operations?
- How are different governments and non-state actors leveraging blockchain for strategic advantage?
- What potential roles could blockchain play in military logistics, command-and-control, or coalition information-sharing?

### Section V. Practical Exercise (Capstone Lab)
- Which specific business rule or workflow will your Hyperledger Fabric smart contract enforce, and why does it require an immutable ledger?
- How will peers endorse, order, and commit transactions to satisfy that rule while protecting any sensitive data?
- Which security controls—access lists, endorsement policies, error handling—must be implemented before a live rollout?
- How will you validate success and communicate results to stakeholders during your project demo?
