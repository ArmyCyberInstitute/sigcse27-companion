# Browser dependencies

These assets support lesson rendering without external downloads.

- `mathjax/2.7.9/` contains the compressed runtime, configurations, extensions, fonts, and localization from the official `mathjax@2.7.9` npm package. Its Apache-2.0 license is included. The package's duplicate uncompressed source and test pages are omitted.
- `fonts/lato/` and `fonts/newscycle/` contain the static font files used by the slide theme, from the corresponding `ofl/` directories in [Google Fonts](https://github.com/google/fonts). Each family includes its copyright and SIL Open Font License notice.
- `fontawesome/` contains Font Awesome Free 6.0.0 CSS and fonts with their component licenses.
- `tailwind/` contains MIT-licensed CSS built with Tailwind CSS 3.4.17 from the HTML classes used across the snapshot activities. Rebuild it with `npx --package tailwindcss@3.4.17 tailwindcss --input INPUT.css --content 'snapshots/*/assets/labs/**/*.html' --output web/vendor/tailwind/course-labs.css --minify`, where `INPUT.css` contains the `@tailwind base;`, `@tailwind components;`, and `@tailwind utilities;` directives.

The post-render script directs Reveal's math loader and slide font styles to these files. The signatures microlab also includes its own MathJax distribution alongside the activity.
