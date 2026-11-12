from pathlib import Path
import json, re, sys
root = Path(__file__).resolve().parents[1]
errors = []
for p in root.rglob('*'):
    if not p.is_file() or any(x in p.relative_to(root).parts for x in ['.quarto', '_site', 'dist', '__pycache__', '.pytest_cache']):
        continue
    if p.name in ['.DS_Store', '.env', 'student-accounts.json', 'deployment.json'] or p.suffix in ['.sqlite', '.db', '.pdf']:
        errors.append(str(p.relative_to(root)))
    if p.suffix in ['.qmd', '.py', '.md', '.html', '.json', '.yml', '.yaml', '.tex', '.sty', '.bib']:
        text = p.read_text(errors='replace')
        if re.search(r'[\w.+-]+@(?:westpoint\.edu|usma\.edu|army\.mil)', text, re.I):
            errors.append('delivery contact: ' + str(p.relative_to(root)))
banks = list((root / 'quizes/quiz_json').glob('*-quiz-bank.json'))
assert len(banks) == 3
for p in banks:
    bank = json.loads(p.read_text())
    assert bank['metadata']['publication_sample'] is True
    assert len(bank['questions']) >= 13
manifest = json.loads((root / 'artifact-manifest.json').read_text())
for entry in manifest:
    if not (root / entry['public_path']).is_file():
        errors.append('missing manifest artifact: ' + entry['public_path'])
if errors:
    sys.exit('Release checks failed:\n' + '\n'.join(errors))
print(f'Release checks passed: {len(manifest)} copied artifacts, {len(banks)} new banks')
