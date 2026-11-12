from pathlib import Path
import hashlib, zipfile
from check_public_material import check
root = Path(__file__).resolve().parents[1]
check(root)
out = root / 'dist'
out.mkdir(exist_ok=True)
# Explicit export roots: unrelated files, runtime state, and build output never enter sources.
roots = ['README.md', 'LICENSE', 'NOTICE', 'THIRD_PARTY_LICENSES.md', 'licenses', 'Makefile', 'compose.yaml', '_quarto.yml', 'index.qmd', 'collection.qmd', 'labs', 'lab-guide.qmd', '.dockerignore', 'deploy', 'web', 'tests', 'artifact-manifest.json', '.gitignore', '.github', '_extensions', 'snapshots', 'demos', 'process', 'quizes', 'scripts', 'docs']
excluded = {'dist', '__pycache__', '.pytest_cache', '.quarto', 'node_modules', '.env', 'output'}
def archive(name, paths, base):
    with zipfile.ZipFile(out / name, 'w', zipfile.ZIP_DEFLATED) as z:
        for p in sorted(set(paths)):
            if p.is_file() and p.suffix not in ['.log', '.sqlite', '.db'] and not any(x in excluded or (base == root and x.endswith('_files')) for x in p.relative_to(base).parts):
                z.write(p, p.relative_to(base))
paths = []
for name in roots:
    p = root / name
    paths.extend(p.rglob('*') if p.is_dir() else [p])
archive('curriculum-source.zip', paths, root)
import shutil
(root / '_site/downloads').mkdir(exist_ok=True)
shutil.copyfile(out / 'curriculum-source.zip', root / '_site/downloads/curriculum-source.zip')
archive('curriculum-site.zip', (root / '_site').rglob('*'), root / '_site')
(out / 'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + p.name + '\n' for p in sorted(out.glob('*.zip'))))
print(out)
