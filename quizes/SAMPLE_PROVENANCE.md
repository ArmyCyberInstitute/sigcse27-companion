# Sample question banks

Three demonstration banks cover hashing and Merkle trees, digital signatures, and Proof of Stake. Each bank contains 13 multiple-choice questions grounded in the corresponding final lesson, with answers, distractors, explanations, difficulty levels, tags, and source references.

Use `templates/publication-demo.json` to select questions from these banks. The other templates illustrate selections for the broader course lesson IDs. The [generation guide](QUIZ_BANK_GENERATION_GUIDE.md) describes a larger authoring workflow with lesson and reading questions; these samples use lesson sources.

Run `make quiz-bundle` from the repository root to create `quizes/dist/blockchain-course-quiz-bank-bundle.json`, then import it through the quiz engine instructor interface. The Compose deployment loads the three banks automatically. The bundler validates and assembles committed banks. See the [demonstration guide](../docs/DEMOS.md) for a complete quiz workflow.
