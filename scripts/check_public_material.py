"""Fail publication builds if assessment solutions or evidence bundles return."""
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
FORBIDDEN={
 'docs/BITCOIN_FORENSICS.md',
 'docs/BITCOIN_FORENSICS.html',
 'demos/bitcoin/INSTRUCTOR_SOLUTION_GUIDE.md',
 'demos/cryptography/solution.md',
 'demos/ethereum_lab/frontend/src/views/TokenConceptsView.jsx',
 'demos/bitcoin/reference-ui/admin.html',
 'demos/bitcoin-base/forensics/build_examples.py',
 'demos/bitcoin-base/forensics/catalog.yaml',
 'demos/ethereum_lab/docs/instructor/INSTRUCTOR_LAB_SCENARIOS.md',
}
ETH=ROOT/'demos/ethereum_lab/scripts/cli-labs/standalone'
FORBIDDEN.update(str(p.relative_to(ROOT)) for p in ETH.glob('forensics-setup*.js'))
for name in ['forensics-setup.js','forensics-setup-advanced.js','6-ransomware-investigation.js','7-ransomware-advanced.js','forensics-case.json','forensics-case-advanced.json']:
 FORBIDDEN.add('demos/ethereum_lab/scripts/cli-labs/standalone/'+name)
def check(root):
 errors=[p for p in FORBIDDEN if (root/p).exists()]
 for directory in ['reference-answers']:
  errors.extend(str(p.relative_to(root)) for p in root.rglob(directory) if p.is_dir() and any(p.iterdir()) and not any(x in p.parts for x in ['node_modules','_site','.quarto']))
 for p in (root/'demos/bitcoin-base/forensics/seeder').glob('scenario_v*.py'):
  errors.append(str(p.relative_to(root)))
 c=json.loads((root/'demos/bitcoin-base/forensics/catalog.json').read_text())
 def walk(value):
  if isinstance(value,dict):
   for key,item in value.items():
    if key.lower() in ['solution','solutions','answer_key','answers','evidence','record']:errors.append('private catalog field: '+key)
    walk(item)
  elif isinstance(value,list):
   for item in value:walk(item)
 walk(c)
 if any(e['id'].startswith(('lab3','lab4','lab5')) for e in c['exercises']):errors.append('assessment exercises in runnable catalog')
 for p in (root/'demos/ethereum_lab').rglob('.forensics-scenario*.json'):
  errors.append(str(p.relative_to(root)))
 for p in (root/'demos/ethereum_lab').rglob('.forensics-scenario*.json'):
  errors.append(str(p.relative_to(root)))
 # Fixed assessment keys may not return inside historical source or legacy UI.
 for name in ['demos/ethereum_lab/frontend/src/App.jsx','demos/ethereum_lab/frontend/src/constants/content.js']:
  if re.search(r'correct\s*:\s*\d+', (root/name).read_text()):errors.append('embedded assessment key: '+name)
 for p in (root/'snapshots').glob('*/historical-labs/exercises/cypherpunk_exercises.py'):
  if re.search(r'[\"\']correct[\"\']\s*:', p.read_text()):errors.append('historical quiz key: '+str(p.relative_to(root)))
 for p in (root/'demos/ethereum_lab').rglob('.forensics-scenario*.json'):
  errors.append(str(p.relative_to(root)))
 for p in (root/'demos/ethereum_lab').rglob('.forensics-scenario*.json'):
  errors.append(str(p.relative_to(root)))
 for p in (root/'demos/ethereum_lab').rglob('.forensics-scenario*.json'):
  errors.append(str(p.relative_to(root)))
 for p in (root/'demos/ethereum_lab').rglob('.forensics-scenario*.json'):
  errors.append(str(p.relative_to(root)))
 for path in FORBIDDEN:
  for prefix in ['_site','_site/source']:
   if (root/prefix/path).is_file():errors.append(prefix+'/'+path)
 for pattern in ['blk*.dat','rev*.dat']:
  errors.extend(str(p.relative_to(root)) for p in root.rglob(pattern) if not any(x in p.parts for x in ['node_modules','.quarto']))
 if errors:raise SystemExit('Publication solution check failed:\n'+'\n'.join(errors))
 print('Public material check passed: no solution bundles or assessment chain')
if __name__=='__main__':check(ROOT)
