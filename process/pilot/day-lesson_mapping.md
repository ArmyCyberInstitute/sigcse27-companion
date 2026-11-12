# Day–Lesson Mapping

## Section I: Introduction and History (Days 1-2)

 **Guiding Questions:**

- What social, political, and economic factors in the late 20th century motivated the search for decentralized trust systems?

- How did the cypherpunk movement shape early ideas about privacy, censorship resistance, and individual autonomy online?

- In what ways do earlier attempts at digital money (e.g., e-gold, DigiCash) illuminate blockchain's design motivations?

- What role did peer-to-peer (P2P) systems like Napster, Gnutella, and BitTorrent play in normalizing distributed architectures without central control?

- Why is the Byzantine Generals Problem important to understanding distributed consensus, and how did blockchain build upon this problem?

- How do blockchains differ from other record-keeping systems such as databases, replicated logs, or distributed file systems?

- What promises did early blockchain advocates make about disintermediation, transparency, and empowerment --- and which of those promises have held up?

- How have regulation, intellectual property debates, and government oversight historically clashed with decentralized technologies?

- What misconceptions about Bitcoin and blockchain arose in the early years, and how have they influenced public perception of the field today?

- Why must modern cyber professionals understand blockchain's historical trajectory to critically evaluate its current risks, opportunities, and hype cycles?

 
### Day 1 -- Social and Economic Primitives of Blockchain Technology and Decentralized Networks

#### Lecture 1: The Cypherpunk Ethos and Decentralized Trust

##### Topics:
- Defining "digital trust" --- why centralization was the default model pre-blockchain.

    -  In a centralized world, trust is not inherent to the system itself but is instead placed in intermediaries. We trust banks to hold our money securely, credit card companies to process our payments accurately, and governments to maintain the rule of law. This \"trust-as-institution\" model relies on reputation, regulation, and legal frameworks to ensure that these central entities act in good faith.

    -  The mechanisms for establishing this trust include stringent identity verification processes (Know Your Customer or KYC), legal contracts, and the backing of government insurance programs. While these measures have been largely effective, they are not without their flaws. The reliance on intermediaries introduces inefficiencies, adds costs for consumers, and creates a risk of data breaches. The 2008 financial crisis serves as a stark reminder of the systemic risks that can arise when trust in these central institutions is misplaced.

- The Cypherpunk Manifesto: privacy as a prerequisite for open society.

- Intellectual property debates and resistance to centralized control of knowledge.

- The link between free cryptography, censorship resistance, and personal sovereignty.

- Early vision: financial freedom, digital self-determination, disintermediation.

##### References:

- [[A Cypherpunk\'s Manifesto | Satoshi Nakamoto Institute]](https://nakamotoinstitute.org/library/cypherpunk-manifesto/)

- [[Against Intellectual Monopoly | Satoshi Nakamoto Institute]](https://nakamotoinstitute.org/library/against-intellectual-monopoly/)

- [[Against Intellectual Property]](https://cdn.nakamotoinstitute.org/docs/against-ip.pdf)

#### Lecture 2: Trust, Coordination, and the Byzantine Problem

##### Topics:

- What is "trust" in digital systems, and why is it difficult without a central arbiter?

- The Byzantine Generals Problem: unreliable actors, coordination, and distributed consensus.

- Classical approaches to fault tolerance vs. blockchain's probabilistic solution.

- Why Byzantine failures matter for money, voting, and coordination.

- Linking theory to practice: why blockchains must solve this problem to exist.

##### References:

- [[the-byzantine-generals-problem.pdf]](https://cdn.nakamotoinstitute.org/docs/the-byzantine-generals-problem.pdf)

#### Lecture 3: Money, Institutions, and the Case for Alternatives

##### Topics:

- Historical role of money and central banks in securing economic coordination.

- Arguments for decentralization: distrust in fiat currency, inflationary pressures, inherent vulnerabilities (inc. information asymmetry).

- The Bitcoin Standard: critique of modern central banking.

- Competing visions: is decentralization about efficiency, freedom, or ideology?

- Early tension between state control of currency vs. private/digital alternatives.

##### References:

- [[The Bitcoin Standard: The Decentralized Alternative to Central Banking: Ammous, Saifedean: 9781119473862: Amazon.com: Books]](https://www.amazon.com/Bitcoin-Standard-Decentralized-Alternative-Central/dp/1119473861)

#### Lecture 4: Bitcoin's Whitepaper and the Birth of Blockchain

##### Topics:

- Bitcoin: A Peer-to-Peer Electronic Cash System: overview of goals and design.

- Core primitives introduced: peer-to-peer networking, digital signatures, Proof-of-Work.

- Why Bitcoin solved the double-spending problem when earlier digital money failed.

- The shift from theory (Byzantine Generals Problem, cypherpunk goals) to practice.

- Early adoption, skepticism, and ideological communities around Bitcoin.

##### References:

- [[Bitcoin: A Peer-to-Peer Electronic Cash System | Satoshi Nakamoto Institute]](https://nakamotoinstitute.org/library/bitcoin/)

#### Lab:

##### References:

 
### Day 2 -- The Technological Evolution of Blockchain Technology and Decentralized Networks

#### Lecture 1: Distributed Systems and Mutual Suspicion

##### Topics:

- What are distributed systems? Definitions and importance.

- The problem of coordinating "mutually suspicious" groups.

- Security and failure in distributed computing.

- Why decentralization introduces unique fault tolerance challenges.

- The lineage from distributed systems research to blockchain architecture.

##### References:

- [[computer-systems-by-mutually-suspicious-groups.pdf]](https://cdn.nakamotoinstitute.org/docs/computer-systems-by-mutually-suspicious-groups.pdf)

 

#### Lecture 2: Public-Key Cryptography and Digital Money Foundations

##### Topics:

- The invention of public key cryptography (Diffie, Hellman, Merkle).

- Why asymmetric cryptography is the backbone of digital trust.

- Application to digital cash and electronic signatures.

- Protocols for public key cryptosystems: securing communication without a trusted intermediary.

- How these protocols directly influenced early digital cash proposals and Bitcoin's eventual design.

##### References:

- [[Protocols for Public Key Cryptosystems | Satoshi Nakamoto Institute]](https://nakamotoinstitute.org/library/public-key-cryptosystems/)

 

#### Lecture 3: Timestamping and Proof of Existence

##### Topics:

- Why "time" matters in digital trust (ordering transactions, preventing replay).

- Early work on secure digital timestamping:

- "Proof of existence" services as blockchain precursors.

- The continuity between timestamping chains and blockchains.

##### References:

- [[Design of a Secure Timestamping Service with Minimal Trust Requirements | Satoshi Nakamoto Institute]](https://nakamotoinstitute.org/library/secure-timestamping-service/)

- [[How to Time-Stamp a Digital Document | Satoshi Nakamoto Institute]](https://nakamotoinstitute.org/library/time-stamp-digital-document/)

- [[Improving the Efficiency and Reliability of Digital Time-Stamping | Satoshi Nakamoto Institute]](https://nakamotoinstitute.org/library/improving-time-stamping/)

 

#### Lecture 4: Smart Contracts

##### Topics:

- Smart contracts as "digital protocols for facilitating, verifying, or enforcing agreements."

- Examples Szabo proposed (digital cash, credit, escrow).

- Negative Reputations: An important and general problem seems to be that of tagging a negative behavior source for future recognition.

- Early thinking about minimizing reliance on trusted intermediaries.

- How reputation and verifiability become building blocks of decentralized finance.

- Why smart contracts remained theoretical in the 1990s.

##### References:

- ![Phone number](media/image1.png){width="0.16944444444444445in" height="0.16944444444444445in"} [[https://nakamotoinstitute.org/library/smart-contracts/]](https://nakamotoinstitute.org/library/smart-contracts/) (1994)

- [[https://nakamotoinstitute.org/library/introduction-to-algorithmic-information-theory/]](https://nakamotoinstitute.org/library/introduction-to-algorithmic-information-theory/) (1996)

- [[https://nakamotoinstitute.org/library/negative-reputations/]](https://nakamotoinstitute.org/library/negative-reputations/) (1996)

- [[https://nakamotoinstitute.org/library/credit-with-privity/]](https://nakamotoinstitute.org/library/credit-with-privity/) (1997)

- [[https://nakamotoinstitute.org/library/distributing-authorities-and-verifying-their-claims/]](https://nakamotoinstitute.org/library/distributing-authorities-and-verifying-their-claims/) (1997)

- [[https://ethereum.org/en/whitepaper/]](https://ethereum.org/en/whitepaper/)

#### Lecture 5: Convergence Toward Blockchain

##### Topics:

- Synthesizing the threads: cryptography (signatures), distributed systems (mutual suspicion, Byzantine), timestamping (immutability).

- Pre-Bitcoin experiments: DigiCash (Chaum), Hashcash (Back), b-money (Dai), Bit Gold (Szabo), e-gold.

- Why these earlier systems failed (trust anchors, scalability, centralization pressure, regulation).

- How these failures informed Nakamoto's solution.

- Transition to Section II: introducing the three blockchain pillars (cryptography, networking, consensus).

##### References:

- Nick Szabo, Bit Gold (1998 blog post/essay)

- Wei Dai, b-money proposal (1998)

- Adam Back, Hashcash (2002)

- David Chaum, Blind Signatures for Untraceable Payments (1983)

- Narayanan et al., Bitcoin and Cryptocurrency Technologies (Princeton, 2016), Ch. 1 (overview of precursors)


#### Lab:

##### References:

 
## Section II: Blockchain Fundamentals (Days 3-5)

 **Guiding Questions:**

- How do the three foundational pillars of blockchain systems (cryptography, networking, and consensus) interact?

- How do cryptographic primitives like hash functions, digital signatures, and Merkle trees ensure data integrity and verifiability?

- Why is pseudorandomness critical to security in blockchain applications?

- How do peer-to-peer systems differ from client-server models in terms of trust, failure modes, and resilience?

- What distinguishes permissioned from unpermissioned ledgers?

- How do distributed consensus mechanisms like Proof-of-Work and Proof-of-Stake align incentives and maintain integrity?

- What role can Hyperledger Fabric play in simulating blockchain behavior in enterprise or government settings?

- What types of attacks (Sybil, 51%, delay, or \"nothing at stake\") pose the greatest threat to consensus security?

- How does Byzantine fault tolerance relate to blockchain design?

- In what ways do consensus choices reflect broader trade-offs between decentralization, performance, and control?

 
### Day 3 -- Hash functions, Merkle trees, and digital signatures

#### Lecture 1: Crypto Intro

##### Topics:

- History: Cryptography and its importance from Mesopotamia to WWII to modern day

- Math primer: Symbols, refresh on probability, proofs, sets

- Pseudo-randomness: Role in crypto, challenges of randomness, considerations of PRGs

- Use in blockchain (Overview): Impact of a lack of a central authority, double spend challenges

##### References: (Ref by Topic: II.1.a-b,i)

- [[https://intensecrypto.org/public/.html]](https://intensecrypto.org/public/.html)

- [[https://intensecrypto.org/public/lec_00_1\_mathematical-background.html]](https://intensecrypto.org/public/lec_00_1_mathematical-background.html)

- [[https://intensecrypto.org/public/lec_03_pseudorandom-generators.html]](https://intensecrypto.org/public/lec_03_pseudorandom-generators.html)

- [[https://intensecrypto.org/public/lec_04_pseudorandom-functions.html]](https://intensecrypto.org/public/lec_04_pseudorandom-functions.html)

- [[https://intensecrypto.org/public/lec_07_hash_functions.html#the-bitcoin-problem]](https://intensecrypto.org/public/lec_07_hash_functions.html#the-bitcoin-problem)

#### Lecture 2: Symmetric Cryptography and hashing

##### Topics:

- Block Cipher: Pseudorandom functions and permutations, roles of block ciphers, examples of block ciphers (AES, DES/3DES, etc.),

- Stream Cipher: Role of stream ciphers, PRGs and stream ciphers, examples (RC4, etc.),

- Hash Functions: Properties of hash functions, their uses, cryptographic vs non-cryptographic hash functions

- Merkle Trees: History of Merkle trees, collision resistant hash functions, implementation of Merkle trees and their uses

- Use in Blockchain (technical): PRGs and the Bitcoin problem, Merkle roots, mathematical foundations of consensus

##### References: (Ref by Topic: II.1.c,e,g,i)

- [[https://intensecrypto.org/public/lec_05_prf-from-prg.html]](https://intensecrypto.org/public/lec_05_prf-from-prg.html)

- [[https://intensecrypto.org/public/lec_03_pseudorandom-generators.html#stream-ciphers]](https://intensecrypto.org/public/lec_03_pseudorandom-generators.html#stream-ciphers)

- [[https://intensecrypto.org/public/lec_07_hash_functions.html]](https://intensecrypto.org/public/lec_07_hash_functions.html)

- [[https://shattered.io]](https://shattered.io)

- [[https://intensecrypto.org/public/lec_08_hash_functions_part2.html#merkle-trees-and-verifying-storage]](https://intensecrypto.org/public/lec_08_hash_functions_part2.html#merkle-trees-and-verifying-storage)

- [[https://intensecrypto.org/public/lec_07_hash_functions.html#the-bitcoin-problem]](https://intensecrypto.org/public/lec_07_hash_functions.html#the-bitcoin-problem)

 

#### Lecture 3: Asymmetric Cryptography

##### Topics:

- History and Use: Merkle, James Ellis and GCHQ, Diffie and Hellman, why we need public key cryptography

- Algorithms (RSA, ECC, etc.): Diffie-Helman and ECC walkthrough, RSA overview,

- Encryption: Using public and private keys, const of asymmetric vs symmetric cryptography

- Key Exchange: Real world uses of asymmetric cryptography for key exchange, practical considerations in distributing public keys

- Digital Signatures: DSA, importance of digital signatures

##### References: (Ref by Topic: II.1.d,f)

- [[https://intensecrypto.org/public/lec_10_public_key_intro.html]](https://intensecrypto.org/public/lec_10_public_key_intro.html)

- [[https://intensecrypto.org/public/lec_11_concrete_pkc.html]](https://intensecrypto.org/public/lec_11_concrete_pkc.html)

- [[https://www-ee.stanford.edu/\~hellman/publications/31.pdf]](https://www-ee.stanford.edu/~hellman/publications/31.pdf)

- [[https://people.csail.mit.edu/rivest/Rsapaper.pdf]](https://people.csail.mit.edu/rivest/Rsapaper.pdf)

- [[https://link.springer.com/chapter/10.1007/3-540-39799-X_31]](https://link.springer.com/chapter/10.1007/3-540-39799-X_31)

#### Lecture 4: Cryptographic Assumptions and Challenges

##### Topics:

- SHA1, SHAttered: History and use of SHA1, timeline of attacks on SHa1, brute forcing cost, SHAttered

- Quantum cryptography: implications of quantum and Shor\'s algorithm, quantum and impact beyond Shor\'s algorithm, interest in lattice cryptogrpahy

- Homomorphic encryption: history and uses of FHE, overview of FHE and the bootstrapping theorem

- Zero Knowledge Proofs: definition, applications from disarmament to voting, features of zero knowledge proofs

- Homemade crypto failures: The dangers of designing or implementing cryptographic systems on your own: Zeus and RC4 implementation, linux.encoder and rand use, cryptodefense ransomware leaving private key on device

##### References: (Ref by Topic: II.1.h)

- [[https://intensecrypto.org/public/lec_19_quantum.html]](https://intensecrypto.org/public/lec_19_quantum.html)

- [[https://intensecrypto.org/public/lec_12_lattices.html]](https://intensecrypto.org/public/lec_12_lattices.html)

- [[https://intensecrypto.org/public/lec_15_FHE.html]](https://intensecrypto.org/public/lec_15_FHE.html)

- [[https://intensecrypto.org/public/lec_14_zero_knowledge.html]](https://intensecrypto.org/public/lec_14_zero_knowledge.html)

- [[https://blog.checkpoint.com/wp-content/uploads/2016/10/GreatCryptoFailuresWhitepaper_Draft2.pdf]](https://blog.checkpoint.com/wp-content/uploads/2016/10/GreatCryptoFailuresWhitepaper_Draft2.pdf)

#### Lab:

##### References:

 
### Day 4 -- P2P architecture, distributed trust, and failure models

- Key Guiding Questions: 4, 6

#### Lecture 1: Distributed Systems

##### Topics:

- What are distributed systems? Definitions and motivations

- Two main models: Client--server vs. Peer-to-peer (P2P)

- Fallacies of distributed systems: bandwidth, latency, security, trust, reliability

- History and evolution of P2P computing (Napster, Gnutella, SETI@home, BOINC)

- Applications in science, finance, and communications

- Centralized vs. decentralized architectures, trade-offs in resilience and control

##### References: (Ref by Topic: II.2.a-c, II.2.d.i-iv):

- Lamport, "Distribution" memo (1987) -- crisp two-failure taxonomy. [[https://lamport.azurewebsites.net/pubs/distributed-system.txt]](https://lamport.azurewebsites.net/pubs/distributed-system.txt)

- Lampson & Rinard (2002). [[https://ocw.mit.edu/courses/6-826-principles-of-computer-systems-spring-2002/lecture-notes/]](https://ocw.mit.edu/courses/6-826-principles-of-computer-systems-spring-2002/lecture-notes/)

- [[https://arnon.me/wp-content/uploads/Files/fallacies.pdf]](https://arnon.me/wp-content/uploads/Files/fallacies.pdf)

- [[https://satoshi.nakamotoinstitute.org/quotes/p2p-networks/]](https://satoshi.nakamotoinstitute.org/quotes/p2p-networks/)

- [[https://freepastry.org/Pastry.pdf]](https://freepastry.org/Pastry.pdf)

- [[https://pdos.csail.mit.edu/papers/chord%3Asigcomm01/chord_sigcomm.pdf]](https://pdos.csail.mit.edu/papers/chord%3Asigcomm01/chord_sigcomm.pdf)

- [[https://setiathome.berkeley.edu/sah_about.php]](https://setiathome.berkeley.edu/sah_about.php);

- [[https://boinc.berkeley.edu/boinc_a\_platform_for_volunteer_computing.pdf]](https://boinc.berkeley.edu/boinc_a_platform_for_volunteer_computing.pdf)

- [[https://github.com/BOINC/boinc/wiki/How-BOINC-works]](https://github.com/BOINC/boinc/wiki/How-BOINC-works)

- [[https://www.congress.gov/crs-product/R48430]](https://www.congress.gov/crs-product/R48430)

#### Lecture 2: P2P Design

##### Topics:

- Overlay networks: structured vs. unstructured overlays

- Routing strategies in P2P (CAN, Chord, Pastry)

- Architecture patterns: structured, hybrid, supernodes

- Membership protocols: churn, node discovery, routing tables

- Challenges: scalability, network partitions, Sybil vulnerabilities, resilience to churn

##### References: (Ref by topic: II.2.d.vi-ix)

- [[https://www.cs.rice.edu/\~dwallach/pub/osdi2002.pdf]](https://www.cs.rice.edu/~dwallach/pub/osdi2002.pdf)

- [[https://www.cs.princeton.edu/courses/archive/fall19/cos418/papers/can-sigcomm01.pdf]](https://www.cs.princeton.edu/courses/archive/fall19/cos418/papers/can-sigcomm01.pdf)

- [[https://www.cs.umd.edu/projects/p2prg/p2p-overview.pdf]](https://www.cs.umd.edu/projects/p2prg/p2p-overview.pdf)

- [[https://ieeexplore.ieee.org/abstract/document/1461363]](https://ieeexplore.ieee.org/abstract/document/1461363)

- [[https://www.cse.wustl.edu/\~jain/cse570-21/ftp/p2p/index.html]](https://www.cse.wustl.edu/~jain/cse570-21/ftp/p2p/index.html)

- [[https://www.cse.wustl.edu/\~jain/cse571-07/ftp/p2p/]](https://www.cse.wustl.edu/~jain/cse571-07/ftp/p2p/)

- [[https://www.csl.mtu.edu/cs6461/www/Reading/Voulgaris-jnsm05.pdf]](https://www.csl.mtu.edu/cs6461/www/Reading/Voulgaris-jnsm05.pdf)

- [[https://engineering.purdue.edu/\~sanjay/Papers/Recent/npsec.pdf]](https://engineering.purdue.edu/~sanjay/Papers/Recent/npsec.pdf)

- [[https://people.cs.rutgers.edu/\~minsky/papers/p2p-04.pdf]](https://people.cs.rutgers.edu/~minsky/papers/p2p-04.pdf)

#### Lecture 3: Trust and P2P

##### Topics:

- What is trust? Why it matters in distributed and decentralized systems

- Establishing trust between strangers: cryptographic vs. social trust

- Direct vs. indirect trust models

- Reputation-based systems:

    -  PeerTrust: historical comparisons

    -  EigenTrust: global vs. local trust aggregation

    -  Service-based trust and verifying delivery

- Challenges of maintaining trust: sybil attacks, collusion, manipulation

##### References: (Ref by topic II.2.e)

- [[https://www.comp.nus.edu.sg/\~ooibc/courses/cs6203/P2PTrustReport.pdf]](https://www.comp.nus.edu.sg/~ooibc/courses/cs6203/P2PTrustReport.pdf)

- [[https://sites.cc.gatech.edu/projects/disl/PeerTrust/pub/xiong03peertrust.pdf]](https://sites.cc.gatech.edu/projects/disl/PeerTrust/pub/xiong03peertrust.pdf)

- [[https://nlp.stanford.edu/pubs/eigentrust.pdf]](https://nlp.stanford.edu/pubs/eigentrust.pdf)

- [[https://crypto.stanford.edu/portia/papers/marti.pdf]](https://crypto.stanford.edu/portia/papers/marti.pdf)

#### Lecture 4: Distributed Ledgers

##### Topics:

- Distributed ledgers: definitions, types, and how they differ from databases

- Permissioned vs. unpermissioned ledgers

- The role of distributed ledgers in enabling P2P trustless interactions

- Security in ledgers: transparency, immutability, consensus mechanisms

- Trade-offs: performance, scalability, decentralization vs. control

- Case studies: cryptocurrency ledgers, enterprise blockchains (Hyperledger Fabric, gov. applications)

##### References: (Ref by Topic: II.3.f, III.1)

- [[https://satoshi.nakamotoinstitute.org/quotes/cryptocurrency/]](https://satoshi.nakamotoinstitute.org/quotes/cryptocurrency/)

- [[https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/492972/gs-16-1-distributed-ledger-technology.pdf]](https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/492972/gs-16-1-distributed-ledger-technology.pdf)

- [[https://pubmed.ncbi.nlm.nih.gov/39408147/]](https://pubmed.ncbi.nlm.nih.gov/39408147/)

- [[https://www.comp.nus.edu.sg/\~ooibc/bcvsdb.pdf]](https://www.comp.nus.edu.sg/~ooibc/bcvsdb.pdf)

- [[https://www.researchgate.net/profile/Efthimios-Enias-Gojka/publication/353018573_Security_in_Distributed_Ledger_Technology_An_Analysis_of_Vulnerabilities_and_Attack_Vectors]](https://www.researchgate.net/profile/Efthimios-Enias-Gojka/publication/353018573_Security_in_Distributed_Ledger_Technology_An_Analysis_of_Vulnerabilities_and_Attack_Vectors)

#### Lab:

##### References:

 
### Day 5 -- Consensus algorithms and incentive alignment

- Key Guiding Questions: 5, 7-10

#### Lecture 1: Reaching Consensus

##### Topics:

- Definition of consensus in distributed systems: safety and liveness

- Why consensus matters in blockchains (trust minimization, double-spend prevention)

- Families of consensus algorithms (classical protocols vs. blockchain protocols)

- Trade-offs: scalability, fault tolerance, energy use

##### References: (Ref by Topic: II.2.f.i-ii)

- [[https://www.scs.stanford.edu/17au-cs244b/labs/projects/porat_pratap_shah_adkar.pdf]](https://www.scs.stanford.edu/17au-cs244b/labs/projects/porat_pratap_shah_adkar.pdf)

- [[https://cybersecurity.seas.wustl.edu/ning/paper/consensus19.pdf]](https://cybersecurity.seas.wustl.edu/ning/paper/consensus19.pdf)

- [[https://arxiv.org/abs/1904.04098]](https://arxiv.org/abs/1904.04098)

#### Lecture 2: Consensus approaches in blockchain

##### Topics:

- Longest-chain rule (core of Nakamoto consensus)

- Proof of Work (mechanism, incentives, limitations)

- Proof of Stake (validator selection, slashing, security assumptions)

- Contrast of open permissionless settings vs. permissioned settings

##### References: (Ref by Topic: II.2.f.iii-v)

- [[https://nakamotoinstitute.org/library/bitcoin/]](https://nakamotoinstitute.org/library/bitcoin/)

- [[https://satoshi.nakamotoinstitute.org/quotes/proof-of-work/]](https://satoshi.nakamotoinstitute.org/quotes/proof-of-work/)

- [[https://cybersecurity.seas.wustl.edu/ning/paper/consensus19.pdf]](https://cybersecurity.seas.wustl.edu/ning/paper/consensus19.pdf)

- [[https://intensecrypto.org/public/lec_07_hash_functions.html#7.2.1]](https://intensecrypto.org/public/lec_07_hash_functions.html#7.2.1)

- [[https://tselab.stanford.edu/downloads/PoS_LC_SBC2020.pdf]](https://tselab.stanford.edu/downloads/PoS_LC_SBC2020.pdf)

#### Lecture 3: Consensus challenges and attacks

##### Topics:

- Forks: intentional, accidental, and malicious

- Network issues: latency, partitioning, crashing nodes

- Byzantine consensus in practice

- Attacks:

    -  51% attacks

    -  DoS disruptions

    -  PoS-specific attacks (Nothing at Stake, Fake Stake, Timebomb, long-range)

    -  Sybil attacks

##### References: (Ref by Topic: II.2.f.vi.1-2)

- [[https://link.springer.com/article/10.1007/s11704-023-3113-x]](https://link.springer.com/article/10.1007/s11704-023-3113-x)

- [[https://ieeexplore.ieee.org/document/7958588]](https://ieeexplore.ieee.org/document/7958588)

- [[https://arxiv.org/pdf/2305.16927]](https://arxiv.org/pdf/2305.16927)

- [[https://www.researchgate.net/publication/319984012_From_blockchain_consensus_back_to_Byzantine_consensus]](https://www.researchgate.net/publication/319984012_From_blockchain_consensus_back_to_Byzantine_consensus)

- [[https://arxiv.org/pdf/1702.03068.pdf]](https://arxiv.org/pdf/1702.03068.pdf)

- [[https://www.freehaven.net/anonbib/cache/sybil.pdf]](https://www.freehaven.net/anonbib/cache/sybil.pdf)

- [[http://bitcoinist.com/zencash-target-51-attack-loses-500k-double-spend-transactions]](http://bitcoinist.com/zencash-target-51-attack-loses-500k-double-spend-transactions/)

- [[http://www.hashcash.org/papers/hashcash.pdf]](http://www.hashcash.org/papers/hashcash.pdf)

- [[https://www.techscience.com/csse/v48n6/58688]](https://www.techscience.com/csse/v48n6/58688)

- [[https://fc19.ifca.ai/preproceedings/180-preproceedings.pdf]](https://fc19.ifca.ai/preproceedings/180-preproceedings.pdf)

- [[https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=8746079]](https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=8746079)

- [[https://www.sciencedirect.com/science/article/pii/S0957417423001070]](https://www.sciencedirect.com/science/article/pii/S0957417423001070)

#### Lecture 4: Hyperledger Fabric and Distributed Ledgers

##### Topics:

- Introduction to Hyperledger Fabric (permissioned blockchain)

- Why Fabric? (enterprise use cases, modular consensus, privacy)

- Syntax and programming model (channels, chaincode, endorsement policies)

- Walkthrough of Fabric example (fabric-samples repo)

##### References: (Ref by Topic: II.3.f.iii)

- [[https://ui.adsabs.harvard.edu/abs/2018arXiv180110228A/abstract]](https://ui.adsabs.harvard.edu/abs/2018arXiv180110228A/abstract)

- [[https://hyperledger-fabric.readthedocs.io/en/release-2.5/]](https://hyperledger-fabric.readthedocs.io/en/release-2.5/)

- [[https://github.com/hyperledger/fabric-samples]](https://github.com/hyperledger/fabric-samples)

#### Lab:

##### References:

 
## Section III: Bitcoin Frameworks (Day 6)]

 **Guiding Questions:**

- What was Bitcoin's original purpose, and how did its design reflect specific social goals?

- How does Bitcoin implement the blockchain trinity: cryptographic proof, decentralized networking, and consensus via mining?

- What is the UTXO model, and how does it differ from an account-based ledger?

- How do mining, transaction validation, and wallet/address models operate in practice?

- What scripting capabilities exist in Bitcoin, and why are they limited?

- How have Bitcoin's principles influenced financial systems, remittance models, and digital cash usage?

- What real-world failures (overflow bugs, 51% attacks) have occurred in Bitcoin history?

- How do Bitcoin's economics incentivize security but potentially centralize power?

- How do KYC/AML laws impact pseudonymous systems?

- Can Bitcoin scale sustainably, or is it primarily a store of value?

 
### Day 6 -- Architecture, transactions, basic digital contracts, and mining

- Guiding Questions: 1-10

#### Lecture 1: Bitcoin Background

##### Topics:

- History and background: Preceding cyptocurrency attempts, key underlying advancements, Nakamoto\'s whitepaper and identity

- Bitcoin goals and limitations: currency first, avoid centralization, reasons for success, what makes it special today

- Overview of operations: transactions, mining, consensus

##### References: (Ref by Topic: III.3.a,b);

- [[https://www.uc.edu/content/dam/refresh/cont-ed-62/olli/spring22/class-handouts/bitcoin%20101.pdf]](https://www.uc.edu/content/dam/refresh/cont-ed-62/olli/spring22/class-handouts/bitcoin%20101.pdf)

- [[https://nakamotoinstitute.org/bitcoin/]](https://nakamotoinstitute.org/bitcoin/)

- [[https://nakamotoinstitute.org/bitcoin/]](https://nakamotoinstitute.org/bitcoin/)

- [[https://www.cs.princeton.edu/courses/archive/fall14/cos109/bitcoin.primer.pdf]](https://www.cs.princeton.edu/courses/archive/fall14/cos109/bitcoin.primer.pdf)

#### Lecture 2: Mining and Transactions

##### Topics:

- Bitcoin blocks: What is in a \"block\" on the blockchain?

- BTC production: How is BTC mined, what does PoW look like for Bitcoin

- Wallets and addresses: What are addresses and how are they generated

- Transactions: Unspent Transaction Outputs (UTXO), role in Bitcoin transactions, generation of change addresses, fees

##### References: (Ref by Topic: III.3.c.i-iii)

- [[https://developer.bitcoin.org/devguide/block_chain.html]](https://developer.bitcoin.org/devguide/block_chain.html)

- [[https://developer.bitcoin.org/devguide/mining.html]](https://developer.bitcoin.org/devguide/mining.html)

- [[https://developer.bitcoin.org/devguide/wallets.html]](https://developer.bitcoin.org/devguide/wallets.html)

- [[https://developer.bitcoin.org/devguide/transactions.html]](https://developer.bitcoin.org/devguide/transactions.html)

#### Lecture 3: The Bitcoin Network

##### Topics:

- Nodes: What is a node, what is involved in node setup and joining the Bitcoin network?

- Network: P2P design, communication protocols, fault tolerance, network growth

- \"Smart\" contracts: Bitcoin Script and its (significant) limitations, example walkthrough

##### References: (Ref by Topic: III.3.c.iv,v, III.2.b.a)

- [[https://developer.bitcoin.org/devguide/p2p_network.html]](https://developer.bitcoin.org/devguide/p2p_network.html)

- [[https://developer.bitcoin.org/devguide/operating_modes.html]](https://developer.bitcoin.org/devguide/operating_modes.html)

- [[https://developer.bitcoin.org/devguide/contracts.html]](https://developer.bitcoin.org/devguide/contracts.html)

- [[https://river.com/learn/what-are-bitcoin-smart-contracts/]](https://river.com/learn/what-are-bitcoin-smart-contracts/)

#### Lecture 4: Bitcoin Security and Legal Concerns

##### Topics:

- Consensus Attacks Revisited: issues from lecture 5.4, avoiding challenges of PoS consensus

- Overflow Bug: security issues can come from implementation, not just protocol design

- Bitcoin Gold: 51% attack and the dangers of hard forks

- KYC/AML: know your customer and anti-money laundering regulations and their impact on Bitcoin

##### References: (Ref by Topic: III.d)

- [[https://bitcointalk.org/index.php?topic=822.0]](https://bitcointalk.org/index.php?topic=822.0)

- [[https://bitcointalk.org/index.php?topic=823.0]](https://bitcointalk.org/index.php?topic=823.0)

- [[https://nvd.nist.gov/vuln/detail/CVE-2010-5139]](https://nvd.nist.gov/vuln/detail/CVE-2010-5139)

- [[https://www.dci.mit.edu/projects/51-percent-attacks]](https://www.dci.mit.edu/projects/51-percent-attacks)

- [[https://www.stern.nyu.edu/sites/default/files/2024-07/Glucksman_Sak_2024.pdf]](https://www.stern.nyu.edu/sites/default/files/2024-07/Glucksman_Sak_2024.pdf)

- [[https://www.congress.gov/crs-product/R45664]](https://www.congress.gov/crs-product/R45664)

#### Lab:

- Tasks:

- Deploy local test node.

- Create example transactions, mining, simple Script contract.

- See use of UTXOs and change addresses in practice.

##### References:

- Bitcoin regtest example: [[https://github.com/BlockchainCommons/Learning-Bitcoin-from-the-Command-Line/blob/master/A3_0\_Using_Bitcoin_Regtest.md]](https://github.com/BlockchainCommons/Learning-Bitcoin-from-the-Command-Line/blob/master/A3_0_Using_Bitcoin_Regtest.md)

- Includes small double spend/51% attack example: [[https://gist.github.com/System-Glitch/cb4e87bf1ae3fec9925725bb3ebe223a]](https://gist.github.com/System-Glitch/cb4e87bf1ae3fec9925725bb3ebe223a)

 
## Section IV: Ethereum Frameworks (Days 7-8)]

 **Guiding Questions:**

- What motivated Ethereum's creation, and how does its vision extend beyond Bitcoin?

- What are Ethereum's technical foundations?

- How do Solidity contracts compare to Bitcoin's Script language?

- How does Ethereum's block structure, transaction model, and consensus algorithm differ from Bitcoin?

- How do Ethereum Improvement Proposals (EIPs) influence the evolution of the network?

- What kinds of applications---DeFi, NFTs, DAOs---depend on Ethereum's programmability?

- How do fungible tokens (ERC-20) and non-fungible tokens (ERC-721) operate on-chain?

- What risks arise from smart contract bugs, such as The DAO hack?

- How do attacks like balance manipulation or contract reuse affect Ethereum security?

- How do developers balance transparency, immutability, and upgradability?

 
### Day 7 -- Ethereum's programmable architecture

- Guiding Questions: 1-6, 8, 9, 10

#### Lecture 1: Exploring Ethereum

##### Topics:

- History and motivation (Buterin's vision, going beyond currency into computation)

- Ethereum vs. Bitcoin in scope and design

    -  Account model vs. UTXO model

    -  Gas vs. transaction fees

- The Merge (shift from Proof of Work to Proof of Stake)

##### References: (Ref by Topic: III.4.a-b, III.4.c.i)

- [[https://ethereum.org/en/whitepaper/]](https://ethereum.org/en/whitepaper/)

- [[https://gavwood.com/paper.pdf]](https://gavwood.com/paper.pdf)

- [[https://arxiv.org/pdf/2310.01028]](https://arxiv.org/pdf/2310.01028)

#### Lecture 2: Mining, PoS, and Security

##### Topics:

- Ethereum block structure (headers, transactions, state roots)

- Proof of Stake validator selection and block proposal

- Attacks & vulnerabilities: double spending, balance attack, contract reuse, PoS-specific attacks

##### References: (Ref by Topic: III.4.c.i, III.4.d)

- [[https://ethereum.org/en/developers/docs/blocks/]](https://ethereum.org/en/developers/docs/blocks/)

- [[https://arxiv.org/pdf/2310.01028]](https://arxiv.org/pdf/2310.01028)

- [[https://www.cs.umd.edu/\~dml/papers/ethereum_imc18.pdf]](https://www.cs.umd.edu/~dml/papers/ethereum_imc18.pdf)

- [[https://gramoli.github.io/pubs/Balance_Attack_DSN17.pdf]](https://gramoli.github.io/pubs/Balance_Attack_DSN17.pdf)

- [[https://arxiv.org/abs/1805.05004]](https://arxiv.org/abs/1805.05004)

#### Lecture 3: The Ethereum Network

##### Topics:

- Accounts: externally owned vs. contract accounts

- Gas & transactions

- Nodes and Ethereum network architecture

- Ethereum Improvement Proposals (EIPs) and governance

##### References: (Ref by Topic: III.4.c.ii,iii,v)

- [[https://ethereum.org/en/developers/docs/transactions/]](https://ethereum.org/en/developers/docs/transactions/)

- [[https://ethereum.org/en/developers/docs/gas/]](https://ethereum.org/en/developers/docs/gas/)

- [[https://ethereum.org/en/developers/docs/accounts/]](https://ethereum.org/en/developers/docs/accounts/)

- [[https://ethereum.org/en/developers/docs/networks/]](https://ethereum.org/en/developers/docs/networks/)

- [[https://ethereum.org/en/developers/docs/nodes-and-clients/]](https://ethereum.org/en/developers/docs/nodes-and-clients/)

#### Lecture 4: Smart Contract and Solidity

##### Topics:

- Smart contracts: Turing-complete execution

- Solidity syntax basics (types, functions, storage)

- Example contract walkthrough

- Smart contract risks (DAO hack, reentrancy)

##### References: (Ref by Topic: III.4.c.iv, III.2.b.b)

- [[https://ethereum.org/en/developers/docs/smart-contracts/]](https://ethereum.org/en/developers/docs/smart-contracts/)

- [[https://docs.soliditylang.org/en/latest/solidity-by-example.html]](https://docs.soliditylang.org/en/latest/solidity-by-example.html)

- [[https://developer.bitcoin.org/devguide/contracts.html]](https://developer.bitcoin.org/devguide/contracts.html)

- [[https://github.com/hyperledger/fabric-samples]](https://github.com/hyperledger/fabric-samples)

#### Lab:

##### References: (Ref by Topic: III.4.e):

- [[https://geth.ethereum.org/docs/getting-started]](https://geth.ethereum.org/docs/getting-started)

- [[https://brodan.biz/blog/how-to-run-a-private-local-ethereum-network-with-geth/]](https://brodan.biz/blog/how-to-run-a-private-local-ethereum-network-with-geth/)

 
### Day 8 -- Tokenization, NFT logic, and on-chain/off-chain value

- Guiding Questions: 5, 7, 8, 10

#### Lecture 1: What are digital assets?

##### Topics:

- Broad vs narrow scoping

- Examples: cryptocurrencies, memberships, tickets, collectibles

- Digital asset markets and regulatory context

##### References: (Ref by Topic: II.3.c.i, II.3.c.ii.1)

- [[https://jcl.law.uiowa.edu/sites/jcl.law.uiowa.edu/files/2021-08/Kaal_Final_Web_0.pdf]](https://jcl.law.uiowa.edu/sites/jcl.law.uiowa.edu/files/2021-08/Kaal_Final_Web_0.pdf)

- [[https://www.law.cornell.edu/definitions/uscode.php?def_id=26-USC-2050229528-298491989]](https://www.law.cornell.edu/definitions/uscode.php?def_id=26-USC-2050229528-298491989)

- [[https://jcl.law.uiowa.edu/sites/jcl.law.uiowa.edu/files/2021-08/Kaal_Final_Web_0.pdf]](https://jcl.law.uiowa.edu/sites/jcl.law.uiowa.edu/files/2021-08/Kaal_Final_Web_0.pdf)

#### Lecture 2: Tokenization and fungibility

##### Topics:

- Fungible vs. non-fungible tokens

- Real-world use cases: NFTs for art, identity, tickets; tokens for governance or utility

- Tokenization of physical assets

##### References: (Ref by Topic: II.3.c.ii.2, III.2.a.a)

- [[https://www.business.rutgers.edu/business-insights/thought-leadership-what-are-non-fungible-tokens-and-why-there-so-much-hype]](https://www.business.rutgers.edu/business-insights/thought-leadership-what-are-non-fungible-tokens-and-why-there-so-much-hype)

- [[https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4044101]](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4044101)

- [[https://dl.acm.org/doi/abs/10.1145/3492323.3495577]](https://dl.acm.org/doi/abs/10.1145/3492323.3495577)

- [[https://www.congress.gov/crs-product/IF12670]](https://www.congress.gov/crs-product/IF12670)

#### Lecture 3: NFTs and Ethereum

##### Topics:

- ERC-20 vs. ERC-721 standards

- NFT minting on Ethereum (technical steps)

- Case studies: Cryptokitties, Bored Ape Yacht Club

##### References:

- [[https://ethereum.org/en/nft/]](https://ethereum.org/en/nft/)

- [[https://ethereum.org/en/developers/tutorials/how-to-write-and-deploy-an-nft/]](https://ethereum.org/en/developers/tutorials/how-to-write-and-deploy-an-nft/)

- [[https://eips.ethereum.org/EIPS/eip-721]](https://eips.ethereum.org/EIPS/eip-721)

- [[https://eips.ethereum.org/EIPS/eip-20]](https://eips.ethereum.org/EIPS/eip-20)

- [[https://economics.yale.edu/sites/default/files/2022-10/EconomicsNFTs.pdf]](https://economics.yale.edu/sites/default/files/2022-10/EconomicsNFTs.pdf)

#### Lecture 4: NFT and Hyperledger Fabric?

##### Topics:

- Permissioned vs. permissionless NFT ecosystems

- Fabric-based NFT implementations

- Limitations of Fabric vs Ethereum in tokenization

##### References:

- [[https://hyperledger-fabric.readthedocs.io/en/latest/secured_asset_transfer/secured_private_asset_transfer_tutorial.html]](https://hyperledger-fabric.readthedocs.io/en/latest/secured_asset_transfer/secured_private_asset_transfer_tutorial.html)

- [[https://arxiv.org/abs/2111.08893]](https://arxiv.org/abs/2111.08893)

- [[https://www.voguebusiness.com/technology/chinas-nft-market-is-taking-off-but-regulations-stand-in-the-way]](https://www.voguebusiness.com/technology/chinas-nft-market-is-taking-off-but-regulations-stand-in-the-way)

 

#### Lab: NFT on Ethereum and/or Hyperledger

##### References: (Ref by Topic: II.3.c.iii)

- [[https://ethereum.org/en/developers/tutorials/how-to-write-and-deploy-an-nft/]](https://ethereum.org/en/developers/tutorials/how-to-write-and-deploy-an-nft/)

- [[https://hyperledger-fabric.readthedocs.io/en/latest/secured_asset_transfer/secured_private_asset_transfer_tutorial.html]](https://hyperledger-fabric.readthedocs.io/en/latest/secured_asset_transfer/secured_private_asset_transfer_tutorial.html)

 
## Section V: Blockchain in 2025 (Days 9-10)]

 **Day 9 -- Real-world Blockchain Use and Misuse

- Theme: what works, what fails, and what it means for institutions and adversaries.


#### Lecture 1: Production-Grade Applications and Value

##### Topics:

- Real-world utility: inflation hedging, cross-border remittances, immutable audit trails, and smart contracts.

- Case studies: Maersk/TradeLens, EBSI credentialing, California DMV car titles, county vital records, agriculture provenance, vaccination records.

- Distinguishing measurable value vs. hype-driven pilots at scale

##### References:

- Utility: [[https://www.sciencedirect.com/science/article/pii/S0275531924000953]](https://www.sciencedirect.com/science/article/pii/S0275531924000953)

- Cross-border transfers: [[https://link.springer.com/article/10.1057/s41267-024-00705-7]](https://link.springer.com/article/10.1057/s41267-024-00705-7)

- Immutable archives: [[https://www.sciencedirect.com/science/article/pii/S1467089522000501]](https://www.sciencedirect.com/science/article/pii/S1467089522000501)

- Smart contracts: [[https://link.springer.com/article/10.1007/s11276-021-02874-x]](https://link.springer.com/article/10.1007/s11276-021-02874-x)

- DeFi: [[https://ieeexplore.ieee.org/abstract/document/9842637]](https://ieeexplore.ieee.org/abstract/document/9842637)

- NFTs: [[https://www.mdpi.com/2674-1032/1/3/17]](https://www.mdpi.com/2674-1032/1/3/17)

- Maersk/TradeLens: [[https://www.maersk.com/news/articles/2021/07/27/how-blockchain-technology-is-beefing-up]](https://www.maersk.com/news/articles/2021/07/27/how-blockchain-technology-is-beefing-up); [[https://piernext.portdebarcelona.cat/en/technology/the-closure-of-tradelens/]](https://piernext.portdebarcelona.cat/en/technology/the-closure-of-tradelens/)

- EBSI: [[https://ec.europa.eu/digital-building-blocks/sites/display/EBSI/Verifiable+Credentials+Success+Stories]](https://ec.europa.eu/digital-building-blocks/sites/display/EBSI/Verifiable+Credentials+Success+Stories)

- CA DMV: [[https://www.reuters.com/technology/california-dmv-puts-42-million-car-titles-blockchain-fight-fraud-2024-07-30/]](https://www.reuters.com/technology/california-dmv-puts-42-million-car-titles-blockchain-fight-fraud-2024-07-30/)

- Vital records: [[https://www.suttercounty.org/government/county-departments/clerk-recorder/electronic-vital-records]](https://www.suttercounty.org/government/county-departments/clerk-recorder/electronic-vital-records)

- Voting systems: [[https://dl.acm.org/doi/pdf/10.1145/3723178.3723275]](https://dl.acm.org/doi/pdf/10.1145/3723178.3723275)

- Agricultural provenance: [[https://www.congress.gov/crs-product/IF11829]](https://www.congress.gov/crs-product/IF11829)

- Misc. government/real estate/vaccine uses: [[https://www.congress.gov/crs-product/R47064]](https://www.congress.gov/crs-product/R47064)

 

#### Lecture 2: Web3, DeFi, and Tokenized Communities

##### Topics:

- DeFi primitives: AMMs, lending, bridges; composability and systemic risks.

- NFT/tokenized assets: art, identity, governance vs. speculation.

- DAOs: governance successes and failures in practice.

- Rug pulls, FOMO, and scam detection patterns.

##### References:

- DeFi overview: [[https://ieeexplore.ieee.org/abstract/document/9842637]](https://ieeexplore.ieee.org/abstract/document/9842637)

- Rug pulls & FOMO: [[https://dl.acm.org/doi/pdf/10.1145/3639477.3639722]](https://dl.acm.org/doi/pdf/10.1145/3639477.3639722)

- Scam detection: [[https://arxiv.org/pdf/2506.18398]](https://arxiv.org/pdf/2506.18398)

 

#### Lecture 3: Illicit Finance, Forensics, and Regulation

##### Topics:

- Criminal exploitation: mixers, tumblers, ransomware, illicit stablecoin flows.

Pseudonymity vs. anonymity in blockchain.

- Forensic methods: tracing UTXOs vs. account-based ledgers.

- Policy tensions: AML/KYC, compliance, and regulatory oversight.


##### References:

- CRS overview of blockchain and crime: [[https://www.congress.gov/crs-product/R45664]](https://www.congress.gov/crs-product/R45664)

- Anonymous communications & privacy tools: [[https://intensecrypto.org/public/lec_23_anonymous.html]](https://intensecrypto.org/public/lec_23_anonymous.html)

 

#### Lecture 4: Blockchain's Social and Environmental Externalities

##### Topics:

- Energy consumption: Proof-of-Work vs. Proof-of-Stake.

- Environmental and social impacts of mining and validator operations.

- Broader ethical debates: speculation, inequality, and trust.

##### References:

- Environmental impact: [[https://www.sciencedirect.com/science/article/abs/pii/S0160791X24001192]](https://www.sciencedirect.com/science/article/abs/pii/S0160791X24001192)

- Energy sustainability: [[https://www.mdpi.com/1996-1073/16/18/6610]](https://www.mdpi.com/1996-1073/16/18/6610)

- CRS report on blockchain & sustainability: [[https://www.congress.gov/crs-product/R45863]](https://www.congress.gov/crs-product/R45863)

 

#### Lab: Case Analysis Exercise

- Options:

- Option A (Technical): Trace anonymized transactions through a mixer, cluster addresses, and identify choke points.

- Option B (Policy): TradeLens post-mortem: why did the consortium fail? Draft a one-slide executive summary with recommendations.

##### References:

- Bitcoin regtest example (for flow analysis lab): [[https://github.com/BlockchainCommons/Learning-Bitcoin-from-the-Command-Line/blob/master/A3_0\_Using_Bitcoin_Regtest.md]](https://github.com/BlockchainCommons/Learning-Bitcoin-from-the-Command-Line/blob/master/A3_0_Using_Bitcoin_Regtest.md)

 
### Day 10 -- Strategic Outlook and Course Synthesis

#### Lecture 1: Scaling Blockchain Systems

##### Topics:

- The scalability--security--decentralization trilemma.

- Layer-2 solutions: optimistic vs. ZK rollups.

- Sharding and modular blockchain stacks.

- Alternative consensus: Red Belly BFT, Liquid PoS, Proof of Authority/Honesty.

- PoW vs. PoS energy debates.

##### References:

- Scalability overview (WDAS 2018): [[https://youtu.be/9pDTv4D-2uM]](https://youtu.be/9pDTv4D-2uM)

- Red Belly Blockchain: [[https://gramoli.github.io/pubs/redbellyblockchain-oakland21.pdf]](https://gramoli.github.io/pubs/redbellyblockchain-oakland21.pdf); [[https://arxiv.org/abs/1812.11747]](https://arxiv.org/abs/1812.11747)

- Liquid PoS: [[https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4961555]](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4961555)

- Proof of Honesty/Authority: [[https://www.sciencedirect.com/science/article/abs/pii/S1389128622003723]](https://www.sciencedirect.com/science/article/abs/pii/S1389128622003723)

- Environmental impact: [[https://www.sciencedirect.com/science/article/abs/pii/S0160791X24001192]](https://www.sciencedirect.com/science/article/abs/pii/S0160791X24001192)

 

#### Lecture 2: CBDCs, Stablecoins, and Geopolitics

##### Topics:

- CBDC design (retail vs. wholesale; account- vs. token-based).

- Policy implications: monetary control, cross-border settlement, sanctions.

- Stablecoins as de facto national currencies.

- Strategic uses by governments and non-state actors.

##### References:

- CBDCs & policy: [[https://intensecrypto.org/public/lec_24_policy.html]](https://intensecrypto.org/public/lec_24_policy.html)

- CRS overview of government blockchain use: [[https://www.congress.gov/crs-product/R47064]](https://www.congress.gov/crs-product/R47064)

 

#### Lecture 3: Blockchain in Defense and National Security

##### Topics:

- Military logistics: tamper-evident provenance, resilience in contested environments.

- Coalition C2: auditability with selective disclosure, mapping to zero-trust.

- Threat models: metadata leakage, DoS, oracle compromise.

##### References:

- Military applications survey: [[https://www.mdpi.com/2227-7080/13/1/23]](https://www.mdpi.com/2227-7080/13/1/23)

- CRS blockchain policy overview: [[https://www.congress.gov/crs-product/R45664]](https://www.congress.gov/crs-product/R45664)


#### Lecture 4: Future Trajectories, Ethics, and Synthesis

##### Topics:

- Store-of-value vs. speculative asset debates.

- Environmental and social impacts revisited.

- AI watermarking, compliance automation, and the future of blockchain.

- Course synthesis and summary

##### References:

- Digital assets vs. currency controversies: Easy Money (book)

- Rug pulls/FOMO debates: [[https://dl.acm.org/doi/pdf/10.1145/3639477.3639722]](https://dl.acm.org/doi/pdf/10.1145/3639477.3639722)

- Sustainability CRS report: [[https://www.congress.gov/crs-product/R45863]](https://www.congress.gov/crs-product/R45863)

 

- Capstone Lab: Hyperledger Fabric Demo and Stakeholder Briefing

- Tasks:

- Implement a chaincode enforcing a specific business rule.

- Show endorsement, ordering, and commit.

- Present threat model, controls, and test plan.

- Deliver a 3-slide executive briefing for stakeholders.

##### References:

- Hyperledger Fabric documentation: [[https://hyperledger-fabric.readthedocs.io/en/release-2.5/]](https://hyperledger-fabric.readthedocs.io/en/release-2.5/)

- Fabric samples: [[https://github.com/hyperledger/fabric-samples]](https://github.com/hyperledger/fabric-samples)
