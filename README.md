# Blockchain curriculum development artifacts

Companion materials for *Teaching What We Didn’t Know: Lessons from AI-Assisted Curriculum Development*.

This repository provides a limited, representative sample of the course material. 

Explore how explanations and activities develop across early research, pilot, pre-group-review, and final snapshots. The [thread explorer](docs/EXPLORER.md) starts with a topic dropdown, then opens early and final lessons in a viewport-filling reader. It groups repeated versions and supports one-to-four previews and connects each topic to microlabs and running lab environments. The introduction selection follows Trust & Coordination. **Slide sync** in **Controls** links corresponding slides across the visible lessons and can be turned off for independent browsing.

The homepage also offers standalone pilot/final comparisons for coin-flipping proof-of-work mining, smart-contract execution, and MEV/builders/relays under **Highlighted microlabs**.

## Start the collection

Install Docker with Compose v2, then run:

```sh
docker compose up
```

Open **http://localhost:8080**. The first start builds the site and application images, downloads dependencies, and compiles the teaching blockchain software. Later starts reuse those images. Use `docker compose up --build` after changing source files.

Once the images are built, start without downloads using `docker compose up --no-build --pull never -d --wait --wait-timeout 1200`. The local lessons, microlabs, and demonstration workflows support offline use. Embedded videos, external readings, and connections to public blockchain networks require internet access.

| Path | Environment |
|---|---|
| `/` | Thread explorer and comparison workspace |
| `/collection.html` | Artifact index for the published sample |
| `/labs/cryptography/` | Hash collisions, Merkle proofs, encryption, signatures |
| `/labs/bitcoin/` | Student/instructor consoles, terminal primer, Regtest, ClassNet, explorer, mempool, and graph tools |
| `/labs/ethereum/` | Contracts, transactions, validator roles, PoS simulation |
| `/quiz/instructor/` | Question banks, quiz generation, publication, grading |
| `/quiz/student/` | Example student enrollment and quiz attempts |

Nginx publishes one host port; application ports stay inside the Compose network. All examples start together, with one shared instance of each environment and a shared Bitcoin classroom network with visualization services. Instructor controls are available directly. Student enrollment is part of the quiz example, rather than a site-wide login.

Set `PORT=8090` to change the host port or `HOST_BIND=0.0.0.0` to listen on all host interfaces. The default binding is localhost. See the [demonstration guide](docs/DEMOS.md) for exercises and resets.

## Read the development record

The [evolution guide](docs/EVOLUTION.md) follows the teaching threads, and the [artifact manifest](artifact-manifest.json) records provenance and relationships. Historical drafts may contain technical or formatting errors. Final decks include corrected citations and red-bordered accuracy annotations with supporting instructor notes; the [explorer guide](docs/EXPLORER.md) explains how to read them.

The explorer offers lessons, microlabs, and related final labs. Beamer lessons and theme files can be compared with the corresponding final Quarto sources.

## Quiz authoring

`quizes/` contains the bank format, authoring and validation guides, templates, validators, and bundler. Three [sample banks](quizes/SAMPLE_PROVENANCE.md) cover hashing, signatures, and PoS. They load into the shared engine automatically and can also be bundled for import with `make quiz-bundle`.

## Build and test

Docker builds Quarto and the site without a host Quarto installation. The source archive is available from the welcome header and the explorer’s **Controls** menu. Documentation links open rendered guides on the website; the same Markdown files are readable in the repository. For local authoring with Quarto 1.8.24, Python 3, and Make:

```sh
make check
make package
```

This produces source/site ZIP archives and SHA-256 checksums in `dist/`. [Regression playbooks](tests/playbooks/README.md) document the automated and browser-agent workflows.

## License

U.S. government work is in the public domain in the United States under 17 U.S.C. § 105. Original project material otherwise subject to copyright is offered under CC0 1.0 Universal, except where a file or component specifies different terms. Third-party code, fonts, images, and other materials remain subject to their respective licenses.

See [LICENSE](LICENSE), [NOTICE](NOTICE), and the [third-party license index](THIRD_PARTY_LICENSES.md) for scope, attribution, and component-specific terms.
