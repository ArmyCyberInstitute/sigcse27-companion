# Explore a teaching thread

The homepage starts with a thread chooser. Four topics follow trust/coordination, hashing/Merkle trees, signatures, and consensus/PoS through early research, pilot, before group review, and final stages. No lesson loads until a thread is selected; a shared comparison link opens its selected thread directly.

## Compare versions

After a selection, the chooser disappears and the reader fills the viewport. A compact thread dropdown allows switching topics. **Controls** opens a temporary panel containing the timeline, source-format comparison, comparison points, and speaker-note options.

Each topic opens with the earliest and final lesson side by side. Select a timeline stage to add or remove its preview, use **Single** for one large preview, or **All versions** for the distinct versions in a responsive grid. Four previews form a 2×2 layout on a wide screen; narrow screens stack them vertically.

**Slide sync** in **Controls** is on by default. Click a lesson preview to focus it, then use its arrow keys or slide controls. Advancing or selecting a slide moves the other previews to their mapped counterparts. Turn it off to browse independently; turning it back on follows the last preview you navigated.

The final decks provide the reference slide IDs. Earlier slides are matched by their content, including reordered slides and material later split across several slides. A broad earlier slide can remain visible while the final deck advances through its related slides. If the match is in another related lesson at the same stage, that lesson opens in the existing pane. **No matching slide** marks a gap and leaves that pane in place. Slide fragments, source views, microlabs, and live labs do not synchronize.

Some stages have several related lessons. Open **Details** within a preview and use its selector to explore the alternatives. These relationships describe conceptual continuity: early crypto lectures overlap, and the final consensus thread includes a related Ethereum lecture.

The comparison-point menu jumps to matching rendered section headings. A version without a matching section reports that gap and keeps its independent navigation. Open each preview’s **Details** for its section menu or slide controls for closer reading. **Speaker notes** exposes the instructor-facing material; **Source** displays the underlying artifact.

Red borders in the final decks mark statements flagged during a post-instruction accuracy review. Enable **Speaker notes** to read the review finding, clarification, and supporting sources. The notes identify the earlier human review and the later GPT-6.1-Sol review.

**Beamer / Quarto sources** opens the early LaTeX and final Quarto sources side by side for cryptography and consensus. The **File** menu switches between a Beamer lesson and its four theme files. The early crypto lesson covers both hashing and signatures; each thread pairs it with its corresponding final lesson. The consensus pair uses the early reaching-consensus lesson and the final consensus introduction. Beamer sources are displayed as text; the web build does not generate Beamer PDFs.

Comparison URLs preserve the topic, artifact type, activity, stages, lesson choices, source-comparison mode, comparison point, slide-sync preference, and mapped slide.

## Activities and applications

**Highlighted microlabs** on the homepage opens three standalone comparisons: proof-of-work coin mining, smart-contract execution, and MEV/builders/relays. Each starts with its pilot and final versions. Use the reader dropdown to switch between these activities or return to a lesson thread. Their timeline, source views, single-preview layout, and comparison links work like the thread activities.

The **Microlabs** tab has a timeline of distinct activity versions. Its default pair is the earliest available activity and its final version. Repeated versions appear once, with their equivalent stages identified. Comparisons include local JavaScript and CSS as well as the HTML entry page. The progression selector includes Merkle trees and encryption/signatures. The hashing playground is a reference activity linked from the lesson material; it is not a progression comparison.

**Final labs** connects the topic to running examples and guides. Open a lab in a separate tab or preview it in the workspace. The examples share application state across viewers. The quiz builder is also available from the collection links in **Controls**, with three sample banks loaded at startup.

The collection links in **Controls** provide the artifact index for this sample and its source archive. Collection guides open as web pages, each with a **Markdown source** link. Lesson microlab links open the corresponding snapshot’s activity on the same website. Per-preview title bars stay compact; lesson titles and section selectors appear in **Details**.

## Deployment

`docker compose up` builds and starts the explorer and all shared environments behind a single Nginx gateway. Lab links use that same origin. Source previews display text; interactive microlabs use their rendered activity paths.
