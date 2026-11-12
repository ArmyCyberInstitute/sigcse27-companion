from pathlib import Path
import json, os, re, shutil, html
from urllib.parse import quote, unquote, urlsplit, urlunsplit
root = Path(__file__).resolve().parents[1] / '_site'
external_targets = json.loads((root.parent / 'web/external-link-targets.json').read_text())
# Preserve relative navigation when microlabs are hosted below a repository path.
for p in root.rglob('*.html'):
    text = p.read_text()
    # Retain historical source URLs; rendered links open verified primary-source copies.
    def available_target(match):
        original = html.unescape(match[2])
        target = external_targets.get(original)
        return match[1] + html.escape(target, quote=True) + match[3] if target else match[0]
    text = re.sub(r'(href=[\"\'])([^\"\']+)([\"\'])', available_target, text)
    # Reveal's generated math configuration otherwise loads its CDN default,
    # even when the course extension specifies a local MathJax URL.
    mathjax = os.path.relpath(root / 'web/vendor/mathjax/2.7.9/MathJax.js', p.parent)
    text = text.replace('https://cdn.jsdelivr.net/npm/mathjax@2.7.9/MathJax.js', mathjax)
    p.write_text(text)
    if '/snapshots/' in str(p):
        stage = p.relative_to(root).parts[1]
        asset_root = os.path.relpath(root / 'snapshots' / stage / 'assets', p.parent)
        text = text.replace('src="/assets/', 'src="' + asset_root + '/')
        # Historical microlabs retain their authored CDN links in source; web
        # previews share local copies of the same UI libraries.
        tailwind = os.path.relpath(root / 'web/vendor/tailwind/course-labs.css', p.parent)
        icons = os.path.relpath(root / 'web/vendor/fontawesome/css/all.min.css', p.parent)
        text = re.sub(r'<script src=[\"\']https://cdn\.tailwindcss\.com/?[\"\']></script>',
                      f'<link rel="stylesheet" href="{tailwind}">', text)
        text = re.sub(r'(href=[\"\'])[^\"\']*(?:vendor/tailwind/course-labs\.css)([\"\'])',
                      lambda m: m[1] + tailwind + m[2], text)
        text = re.sub(r'(href=[\"\'])[^\"\']*(?:vendor/fontawesome/css/all\.min\.css|cdnjs\.cloudflare\.com/ajax/libs/font-awesome/6\.0\.0/css/all\.min\.css)([\"\'])',
                      lambda m: m[1] + icons + m[2], text)
        pyodide = os.path.relpath(root / 'snapshots/final/assets/vendor/pyodide/v0.24.1/full/pyodide.js', p.parent)
        text = text.replace('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js', pyodide)
        # Lesson activity links always open the copy hosted by this deployment.
        # Keep their snapshot and query/fragment, without an authoring hostname.
        if 'lessons' in p.relative_to(root).parts:
            def local_microlab(match):
                url = urlsplit(match[2])
                marker = '/assets/labs/'
                if marker not in url.path:
                    return match[0]
                activity = unquote(url.path.split(marker, 1)[1])
                target = (root / 'snapshots' / stage / 'assets/labs' / activity).resolve()
                if target.is_dir():
                    target /= 'index.html'
                if not target.is_relative_to(root.resolve()) or not target.is_file():
                    raise ValueError(f'Missing microlab for {p}: {match[2]}')
                path = '/' + quote(target.relative_to(root.resolve()).as_posix(), safe='/')
                href = urlunsplit(('', '', path, url.query, url.fragment))
                return match[1] + href + match[3]
            text = re.sub(r'(href=[\"\'])([^\"\']+)([\"\'])', local_microlab, text)
        p.write_text(text)

# Keep the original slide fonts available without Google Fonts requests.
font_families = {
    'Lato': [('Lato-Regular.ttf', 400, 'normal'), ('Lato-Bold.ttf', 700, 'normal'),
             ('Lato-Italic.ttf', 400, 'italic'), ('Lato-BoldItalic.ttf', 700, 'italic')],
    'News Cycle': [('NewsCycle-Regular.ttf', 400, 'normal'), ('NewsCycle-Bold.ttf', 700, 'normal')],
}
for stylesheet in (root / 'site_libs/revealjs/dist/theme').glob('*.css'):
    text = stylesheet.read_text()
    for family, variants in font_families.items():
        rules = []
        for filename, weight, style in variants:
            path = root / 'web/vendor/fonts' / family.lower().replace(' ', '') / filename
            relative = os.path.relpath(path, stylesheet.parent)
            rules.append(f'@font-face{{font-family:"{family}";font-style:{style};font-weight:{weight};'
                         f'font-display:swap;src:url("{relative}") format("truetype")}}')
        name = re.escape(family.replace(' ', '+'))
        text = re.sub(r'@import\s*[\"\']https://fonts\.googleapis\.com/css\?family=' + name + r'[^\"\']*[\"\'];',
                      ''.join(rules), text)
    stylesheet.write_text(text)

# Quarto's documentation theme also requests Source Sans Pro from Google.
# Reveal already distributes that family locally, including its font notices.
google_font_url = r'''(?:"https://fonts\.googleapis\.com/[^\"]*"|'https://fonts\.googleapis\.com/[^']*')'''
google_font_import = (r'@import\s*(?:' + google_font_url + r'|url\(\s*(?:'
                      + google_font_url + r'|https://fonts\.googleapis\.com/[^\s)]+)\s*\))\s*;')
for stylesheet in (root / 'site_libs/bootstrap').glob('*.css'):
    local_font = root / 'site_libs/revealjs/dist/theme/fonts/source-sans-pro/source-sans-pro.css'
    relative = os.path.relpath(local_font, stylesheet.parent)
    # Font URLs contain semicolons between weights. Match the complete URL so
    # its trailing text cannot corrupt Bootstrap's following CSS rules.
    text = re.sub(google_font_import,
                  f'@import url("{relative}");', stylesheet.read_text())
    stylesheet.write_text(text)

# Source files are exported as text, never executed by the static server.
project = Path(__file__).resolve().parents[1]
# Snapshot extensions share Quarto's output path. Retain the integrated header
# styles when a historical extension is the last one rendered.
header_css = root / 'site_libs/quarto-contrib/reveal-header/reveal-header.css'
if header_css.is_file():
    header_css.write_text((project / '_extensions/aci/_extensions/reveal-header/reveal-header.css').read_text())
catalog = json.loads((project / 'web/catalog.json').read_text())
paths = set()
for activity in catalog.get('additional_microlabs', []):
    for items in activity['versions'].values():
        for artifact in items:
            paths.add(artifact['source'])
            paths.update(artifact.get('equivalent_sources', []))
for thread in catalog['threads']:
    for items in thread['lessons'].values():
        paths.update(a['source'] for a in items)
        for a in items:paths.update(a.get('source_files',[]))
    for family in thread['microlabs'].values():
        for items in family['versions'].values():
            paths.update(a['source'] for a in items)
paths.update(lab['guide'] for lab in catalog['labs'].values())
# The rendered guides share their exact Markdown sources with repository readers.
paths.update(['README.md', 'THIRD_PARTY_LICENSES.md', 'licenses/sources/README.md'])
for directory in ['docs', 'quizes', 'tests/playbooks']:
    paths.update(str(p.relative_to(project)) for p in (project / directory).glob('*.md'))
for name in paths:
    target = root / 'source' / name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(project / name, target)
    if name.endswith('.md'):
        page = (root / name).with_suffix('.html')
        if page.is_file():
            text = page.read_text()
            if 'class="markdown-source"' not in text:
                source = quote(os.path.relpath(target, page.parent), safe='/')
                footer = f'<hr><p class="markdown-source"><a href="{source}">Markdown source</a></p>\n'
                text = text.replace('</main>', footer + '</main>', 1)
                page.write_text(text)

# Header-logo URLs live in metadata and are consumed by the course theme plugin.
# Export their assets explicitly, just as Quarto does for ordinary image elements.
for page in root.rglob('*.html'):
    if page.relative_to(root).parts[0] != 'snapshots':
        continue
    stage = page.relative_to(root).parts[1]
    logo = project / 'snapshots' / stage / '_extensions/aci/logos/ACILogo.png'
    if not logo.exists():
        continue
    text = page.read_text()
    if 'name="reveal-header-logo"' not in text:
        continue
    target = root / 'snapshots' / stage / 'assets/branding/ACILogo.png'
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(logo, target)
    relative = os.path.relpath(target, page.parent)
    text = re.sub(r'(<meta name="reveal-header-logo" content=")[^"]*(")', lambda m: m[1] + relative + m[2], text)
    page.write_text(text)
