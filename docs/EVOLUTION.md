# Evolution guide

Compare lesson scope, sequencing, instructor notes, references, and activities across four development stages. The [artifact manifest](../artifact-manifest.json) links related lessons and records file-level provenance.

| Thread | Early research | Pilot / pre-group review | Final |
|---|---|---|---|
| Trust & coordination | Trust, coordination, and the Byzantine problem | Distributed trust foundations | Trust and distributed systems foundations |
| Hashing / Merkle | Broader symmetric/hashing and Merkle/signature lessons overlap | Dedicated hashing/Merkle lesson | Dedicated lesson with hashing exercise and expanded operational explanations |
| Asymmetric / signatures | Material embedded in broader crypto lessons | Dedicated asymmetric/signature lesson | Dedicated lesson and signature microlab |
| Consensus → PoS | General consensus and adversarial-security drafts | Dedicated PoS lesson | PoS selection/security/finality lecture, plus Ethereum PoS/security lecture and trainer |
| Source formats | Beamer cryptography and consensus lessons; four theme files | Quarto lesson sources | Quarto lessons, including hashing, signatures, and consensus introduction source comparisons |
| Microlabs | — | Merkle-tree and signature activities | Revised Merkle-tree and signature activities |
| Full labs | — | Selected exercise packages; pre-review Bitcoin environment | Cryptography, Bitcoin, Ethereum demonstrations |

The early lessons combine topics that later become separate lectures. Trust and coordination develop into distributed-systems foundations; cryptography develops distinct hashing and signature threads; consensus progresses into PoS and Ethereum activities. Pilot and pre-review artifacts include both revisions and unchanged material.

The explorer compares distinct Merkle-tree and encryption/signature microlab versions. Identical stages share one preview. The hash playground is a reference activity. The final Ethereum lab includes its own teaching PoS model.

Final lesson citations have been corrected. Red borders and speaker notes identify statements flagged during the later accuracy review; see the [explorer guide](EXPLORER.md). Earlier snapshots remain a record of their instructional stage.

Historical code supports source inspection. The [final demonstrations](DEMOS.md) provide supported local launch paths, and the [sample quiz banks](../quizes/SAMPLE_PROVENANCE.md) support assessment-tool exploration.

## Lesson sources by stage

### early-work

- [day3_lecture2_symmetric_hashing](<../snapshots/early-work/lessons/day 3/day3_lecture2_symmetric_hashing.qmd>)
- [day3_lecture3_merkle_signatures](<../snapshots/early-work/lessons/day 3/day3_lecture3_merkle_signatures.qmd>)
- [day3_lecture4_consensus](<../snapshots/early-work/lessons/day 3/day3_lecture4_consensus.qmd>)
- [day1_lesson2](../snapshots/early-work/lessons/day1_lesson2.qmd)
- [blockchain_day_5_lesson_1](../snapshots/early-work/lessons/day5/blockchain_day_5_lesson_1.qmd)
- [blockchain_day_5_lesson_3](../snapshots/early-work/lessons/day5/blockchain_day_5_lesson_3.qmd)

### pilot

- [l03_i3_trust_and_distributed_systems_foundations_for_blockchain](../snapshots/pilot/lessons/introduction/l03_i3_trust_and_distributed_systems_foundations_for_blockchain.qmd)
- [l05_p2_hashing_and_merkle_trees](../snapshots/pilot/lessons/primitives/l05_p2_hashing_and_merkle_trees.qmd)
- [l07_p4_asymmetric_encryption_and_digital_signatures](../snapshots/pilot/lessons/primitives/l07_p4_asymmetric_encryption_and_digital_signatures.qmd)
- [l15_p12_pos](../snapshots/pilot/lessons/primitives/l15_p12_pos.qmd)

### pre-group-review

- [l03_i3_trust_and_distributed_systems_foundations_for_blockchain](../snapshots/pre-group-review/lessons/introduction/l03_i3_trust_and_distributed_systems_foundations_for_blockchain.qmd)
- [l05_p2_hashing_and_merkle_trees](../snapshots/pre-group-review/lessons/primitives/l05_p2_hashing_and_merkle_trees.qmd)
- [l07_p4_asymmetric_encryption_and_digital_signatures](../snapshots/pre-group-review/lessons/primitives/l07_p4_asymmetric_encryption_and_digital_signatures.qmd)
- [l15_p12_pos](../snapshots/pre-group-review/lessons/primitives/l15_p12_pos.qmd)

### final

- [01-CM-consensus_in_distributed_systems_and_blockchains_intro](../snapshots/final/lessons/consensus_primitives/01-CM-consensus_in_distributed_systems_and_blockchains_intro.qmd)
- [03-CM-pos](../snapshots/final/lessons/consensus_primitives/03-CM-pos.qmd)
- [02-EF-ethereum_mining_pos_and_security](../snapshots/final/lessons/ethereum/02-EF-ethereum_mining_pos_and_security.qmd)
- [05-IN-trust_and_distributed_systems_foundations_for_blockchain](../snapshots/final/lessons/introduction/05-IN-trust_and_distributed_systems_foundations_for_blockchain.qmd)
- [02-CP-hashing_and_merkle_trees](../snapshots/final/lessons/primitives/02-CP-hashing_and_merkle_trees.qmd)
- [04-CP-asymmetric_encryption_and_digital_signatures](../snapshots/final/lessons/primitives/04-CP-asymmetric_encryption_and_digital_signatures.qmd)

