# Third-party licenses and attribution

The public-domain and CC0 terms in [LICENSE](LICENSE) cover original project material only. The following components have separate terms. Component-level copyright and license notices apply wherever those components appear, including their copies across snapshots.

## Bundled components

| Component and location | License and attribution |
|---|---|
| js-md5 in `snapshots/*/assets/labs/micro-hashing/libs/js-md5/` | MIT; copyright Chen, Yi-Cyuan. Each copy includes `LICENSE.txt`. |
| MathJax in `snapshots/final/assets/labs/signatures/mathjax/` and `web/vendor/mathjax/2.7.9/` | Apache-2.0; see each component’s `LICENSE` and [upstream](https://github.com/mathjax/MathJax). |
| Lato and News Cycle fonts in `web/vendor/fonts/` | SIL Open Font License 1.1; copyright notices and terms are in each family’s `OFL.txt`. Distributed through [Google Fonts](https://github.com/google/fonts). |
| Pyodide 0.24.1 loader in `snapshots/*/assets/vendor/pyodide/` | MPL-2.0; [license](licenses/MPL-2.0.txt), [versioned source](https://github.com/pyodide/pyodide/tree/0.24.1). Additional Python/WebAssembly packages fetched by Pyodide have their own licenses. |
| Font Awesome Free 6.0.0 in `snapshots/*/assets/vendor/fontawesome/` and `web/vendor/fontawesome/` | Code: MIT; fonts: SIL OFL-1.1; SVG/JavaScript icons: CC-BY-4.0. Copyright Fonticons, Inc. See [component terms](licenses/Font-Awesome-Free.txt), [OFL](licenses/OFL-1.1.txt), and [upstream](https://github.com/FortAwesome/Font-Awesome/tree/6.0.0). |
| Tailwind-derived CSS in `snapshots/*/assets/vendor/tailwind/` and `web/vendor/tailwind/` | MIT; copyright Tailwind Labs, Inc. See [license](licenses/Tailwind-MIT.txt) and [upstream](https://github.com/tailwindlabs/tailwindcss). |
| Ethers UMD bundle in `demos/ethereum_lab/frontend/public/vendor/ethers/` | MIT; copyright Richard Moore. See the component’s `LICENSE.md`. |
| Solidity compiler 0.8.26 in `demos/ethereum_lab/frontend/public/vendor/solc/bin/` | GPL-3.0; see [license](licenses/GPL-3.0.txt) and [accompanying source](licenses/sources/README.md). The `solc-js` JavaScript wrapper is separately MIT-licensed; its `LICENSE` is in the parent `solc/` directory. |
| Quarto rrqrcode extension in `_extensions/ryanraaum/rrqrcode/` and snapshot copies | Extension: [MIT](licenses/rrqrcode-MIT.txt), copyright Ryan Raaum. Its dependencies have separate MIT [bitops](licenses/rrqrcode-bitops.txt), LGPL-3.0 [PNG encoder](licenses/rrqrcode-pngencoder.txt), and BSD-3-Clause [QR encoder](licenses/rrqrcode-qrencode.txt) notices. [Upstream](https://github.com/ryanraaum/quarto-rrqrcode). |
| Beamer-derived themes and templates in `_extensions/aci/beamer/` and snapshot copies, plus the archival theme files in `snapshots/early-work/beamer/` | Upstream portions carry LaTeX Project Public License and/or GNU GPL terms as identified in their headers. See [Beamer’s license statement](licenses/Beamer.txt), [LPPL-1.3c](licenses/LPPL-1.3c.txt), [GPL-2.0](licenses/GPL-2.0.txt), and [upstream](https://github.com/josephwright/beamer). |
| Cytoscape.js in `demos/bitcoin-graph/app/static/vendor/` | MIT; copyright The Cytoscape Consortium. See the accompanying `cytoscape.LICENSE`. |
| Hardhat starter contract and tests in `demos/ethereum_lab/contracts/Lock.sol` and `demos/ethereum_lab/test/Lock.js` | Unlicense; adapted from Nomic Foundation's [Hardhat sample project](https://github.com/NomicFoundation/hardhat/tree/hardhat%402.12.0/packages/hardhat-core/sample-projects/javascript). The [upstream package license](https://github.com/NomicFoundation/hardhat/blob/hardhat%402.12.0/packages/hardhat-core/LICENSE) dedicates `sample-projects/` to the public domain. See [bundled terms](licenses/Hardhat-samples.txt). |
| Solidity examples with `SPDX-License-Identifier` headers | The identifier in each file specifies its terms. Original project simulators use CC0-1.0. Imported OpenZeppelin contracts have their own MIT terms. |
| Vite starter logo in `demos/ethereum_lab/frontend/public/vite.svg` | CC0-1.0 under the `create-vite` package's explicit terms for template directories. Matches the [React template asset](https://github.com/vitejs/vite/blob/v7.3.0/packages/create-vite/template-react/public/vite.svg). See [upstream package terms](licenses/Vite-create-vite.txt). This does not grant trademark rights. |

## Installed and generated dependencies

Package manifests, lockfiles, Python requirements, and Dockerfiles identify application dependencies. These include Flask, Streamlit, cryptography, React, Vite, Hardhat, OpenZeppelin, Ethers, xterm.js, Bitcoin Core, ttyd, zellij, and operating-system packages. They are installed under their own licenses; this project’s CC0 dedication does not relicense them.

The Bitcoin tools image builds [Mempool](https://github.com/mempool/mempool) under AGPL-3.0, [mempool-electrs](https://github.com/mempool/electrs) under MIT, and [BTC RPC Explorer](https://github.com/janoside/btc-rpc-explorer) under MIT. The graph service installs Neo4j Community under GPL-3.0. Their upstream source and package notices retain the applicable terms. The Dockerfiles identify source revisions; local changes to Mempool are in `demos/bitcoin/mempool/mempool-basepath.patch` and its deployment scripts.

Browser checks use Playwright under Apache-2.0 and its separately licensed browser distribution. These are development dependencies.

Quarto generates site assets including Reveal.js, Bootstrap, JavaScript libraries, and fonts. Generated distributions must include their accompanying notices. Bitcoin builds fetch the pinned Bitcoin Core source and upstream utilities, whose source and installed package notices describe their licenses.

## Teaching media and references

The 200 NFT illustrations in `demos/ethereum_lab/frontend/public/labs/ethereum_lab/nft-assets/` were generated with generative AI by the course authors. Their generation and image-processing scripts are in `demos/ethereum_lab/scripts/`. The project terms in [LICENSE](LICENSE) apply to the contributors' rights in this artwork.

| Media | Attribution and terms |
|---|---|
| `snapshots/final/lessons/images/eth_merge.png` | Execution-layer and consensus-layer diagram generated with AI by a course author. The authors report an OpenAI SynthID watermark in this image. The project terms in [LICENSE](LICENSE) apply to the contributors' rights in this artwork. |
| `demos/ethereum_lab/frontend/public/pos-diagram.svg` | Course-provided proof-of-stake validation diagram. The project terms in [LICENSE](LICENSE) apply to the contributors' rights in this artwork. |
| `ACILogo.png` and `ACILogoAndTitle.png` in the course themes and snapshots | Army Cyber Institute, United States Military Academy; [institutional website](https://cyber.army.mil/). These identify the source institution. No trademark license is granted. |

Third-party illustrations, screenshots, photographs, quoted excerpts, and logos are governed by their source terms and slide-level attributions. Citation alone does not grant a copyright license. Government and institutional marks may have use restrictions independent of copyright. The project’s public-domain statement does not apply to third-party teaching media.
