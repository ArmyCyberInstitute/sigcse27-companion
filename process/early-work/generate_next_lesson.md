You are tasked with generating the Quarto slide deck for **Day 5, Lesson X** in the Army Cyber Institute Blockchain Course.

------------------------------------------------
Inputs
------------------------------------------------
Use the following files as authoritative references and content sources:

* Formatting & Template Example: blockchain_day_5_lesson_1.qmd (the authoritative style/structure template; formatting must match exactly).
* Course Scope: draft_syllabus.md
* Lesson Coverage: day-lesson_mapping.md → use the entry for the individual lesson you are tasked to build.
* Depth & Guiding Questions: terminal_learning_objectives.md
* Bibliography: Blockchain.bib (Source and cite all content from here using exact tag from the .bib file).
* Content Sources: Follow relevant Blockchain.bib links to source content. Provide BibLaTeX-formatted citation for external sources not in Blockchain.bib.

------------------------------------------------
Requirements
------------------------------------------------

Formatting
* Use the same YAML front matter and revealjs configuration as in blockchain_day_5_lesson_1.qmd.
* Set csl: ieee.csl and format.revealjs.theme: aci-revealjs.
* Each slide must begin with a level-2 header (##).
* Use :::: {.columns} for multi-column layouts, with each column defined by ::: {.column width="x%"} … :::.
* Lists must follow this hierarchy:
  ### first level
  * second level
    - third level (indented 2 spaces)

Slide Content
* Include a title slide with lesson number, title, date, and instructor.
* All slides must use clean, consistent layouts.
* Nearly every slide should include a graphic or chart (e.g., Mermaid diagrams, flowcharts, sequences, timelines). Place graphics in a column next to text whenever possible.
* Avoid generic “four vague bullets.” Content must be engaging, specific, and operationally relevant.

Instructor Notes
Each slide must contain a ::: {.notes} block with the following sections in this order:

1. Key Points
  * Concise bullets with the student takeaways.
2. Instructor Notes
  * Long-form narrative (3–5 paragraphs).
  * Rich in technical detail, context, and analogies.
  * No markdown formatting inside notes—plain text only, with *, -, + list hierarchy where needed.
3. Script
  * Word-for-word suggested dialogue, accessible at ~8th grade reading level.
  * Must explain graphics, connect to the big picture, and use analogies.
4. Q & A
  * Suggested student engagement questions with concise answers.
5. References
  * List of cited sources, strictly from Blockchain.bib.

Audience & Pedagogy
* Audience: threat hunters & cyber operations professionals.
  * the audience is primarily made of high school graduates who have above-average technical aptitude, but no formal advanced education in mathematics or cryptography. 
* Emphasize adversarial use of blockchain, detection opportunities, and defensive responses.
* Include scenarios and runbook actions (e.g., raise confirmations, pause transfers, rotate peers).
* Lesson must fit within ~50 minutes, consistent with Lesson 1 pacing.

Content Depth
* Each slide’s notes section should span 75–100 lines of text (Key Points + Instructor Notes + Script + Q&A + References).
* Instructor Notes must provide enough depth to answer technical questions and connect concepts to adversarial operations.
* Script should be explanatory, simplified, and directly tied to visuals.

------------------------------------------------
Output
------------------------------------------------

Provide the complete .qmd text file for this lesson, named:
blockchain_day_5_lesson_X.qmd

The file must:
* Compile cleanly in Quarto Revealjs without syntax errors.
* Follow the formatting and style of blockchain_day_5_lesson_1.qmd exactly.
* Be complete, polished, and ready for instructional use with no post-editing required.

------------------------------------------------
Slide Specification Template
------------------------------------------------
For each slide, follow this exact structure (columns only required if suited to layout of content):

## Slide Title

:::: {.columns}
::: {.column width="X%"}
* Main content bullets here
- Second-level point
  + Third-level point
:::
::: {.column width="Y%"}
```{mermaid}
(diagram)
```
:::
::::

::: {.notes}
Key Points:
* List 3–5 concise takeaways

Instructor Notes:
[3–5 paragraphs of narrative text, no markdown, plain text only. Rich technical background, operational context, analogies.]

Script:
- "Word-for-word suggested dialogue for instructors, simplified, explanatory, and tied to visuals."

Q & A:
* Q: Question?
- A: Answer.

References:
- @citation_key_from_Blockchain.bib
:::
 