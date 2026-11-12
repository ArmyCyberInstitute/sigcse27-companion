from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote,urlsplit
r=Path(__file__).resolve().parents[1] / '_site'
class Links(HTMLParser):
 def handle_starttag(self,tag,attrs):
  meta=dict(attrs)
  if tag=='meta' and meta.get('name')=='reveal-header-logo' and meta.get('content'):self.links.append(meta['content'])
  for k,v in attrs:
   if k in ['src','href'] and v: self.links.append(v)
class SlideAnchors(HTMLParser):
 def __init__(self):super().__init__();self.keys=set();self.reviewed=0
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='section' and ('data-sync-id' in a or 'data-sync-unmatched' in a):
   self.reviewed+=1;self.keys.update(a.get('data-sync-id','').split())
missing={}
navigation_errors=[]
for p in r.rglob('*.html'):
 if 'source' in p.relative_to(r).parts:continue
 h=Links();h.links=[]
 try:h.feed(p.read_text())
 except:continue
 for ref in h.links:
  u=urlsplit(ref)
  if 'lessons' in p.relative_to(r).parts and '/assets/labs/' in u.path:
   stage=p.relative_to(r).parts[1]
   if u.scheme or u.netloc or not u.path.startswith('/snapshots/'+stage+'/assets/labs/') or not u.path.endswith('.html'):
    navigation_errors.append(f'{p.relative_to(r)}: microlab must use this snapshot on the current origin: {ref}')
  if u.scheme or u.netloc or not u.path:continue
  path=unquote(u.path)
  if path.endswith('.qmd'):path=path[:-4]+'.html'
  t=(r/path.lstrip('/')) if path.startswith('/') else (p.parent/path)
  relative=t.resolve().relative_to(r.resolve()).as_posix() if t.resolve().is_relative_to(r.resolve()) else ''
  if relative.endswith('.md') and not relative.startswith('source/') and t.with_suffix('.html').is_file():
   navigation_errors.append(f'{p.relative_to(r)}: guide link must open its rendered page: {ref}')
  dynamic=('labs/cryptography','labs/bitcoin/node-1','labs/bitcoin/node-2','labs/bitcoin/mempool','labs/bitcoin/btc-explorer','labs/bitcoin/graph','labs/bitcoin/student/share','labs/bitcoin/instructor/share','api','labs/ethereum','quiz','downloads')
  if any(relative==prefix or relative.startswith(prefix+'/') for prefix in dynamic):continue
  if not t.exists():missing.setdefault(ref,[]).append(str(p.relative_to(r)))
# Catalog-driven previews and source views are not ordinary HTML links.
import json
catalog_path=r/'web/catalog.json'
if catalog_path.exists():
 catalog=json.loads(catalog_path.read_text())
 refs=[]
 checked_slides=set()
 for thread in catalog['threads']:
  for group in thread['lessons'].values():
   for artifact in group:
    if artifact['format']!='Quarto' or artifact['source'] in checked_slides:continue
    checked_slides.add(artifact['source']);page=r/artifact['url']
    if not page.is_file():continue
    anchors=SlideAnchors();anchors.feed(page.read_text())
    import re
    source=re.sub(r'<!--.*?-->','',(r.parent/artifact['source']).read_text(),flags=re.S)
    count=len(re.findall(r'(?m)^## ',source))+1
    if anchors.keys!=set(artifact['sync_keys']) or anchors.reviewed!=count:
     navigation_errors.append('Rendered slide anchors differ from source: '+artifact['source'])
 for thread in catalog['threads']:
  groups=list(thread['lessons'].values())
  for family in thread['microlabs'].values():groups.extend(family['versions'].values())
  for group in groups:
   for artifact in group:
    refs.extend([artifact['url'],'source/'+artifact['source']])
    refs.extend('source/'+p for p in artifact.get('source_files',[]))
 for lab in catalog['labs'].values():refs.extend([lab['guide_url'],'source/'+lab['guide']])
 for activity in catalog.get('additional_microlabs',[]):
  for artifacts in activity['versions'].values():
   for artifact in artifacts:
    refs.extend([artifact['url'],'source/'+artifact['source']])
    refs.extend('source/'+path for path in artifact.get('equivalent_sources',[]))
 for ref in refs:
  if not (r/unquote(urlsplit(ref).path)).is_file():missing.setdefault(ref,[]).append('web/catalog.json')
print(len(missing),'unique missing paths')
for ref,paths in missing.items(): print(ref,paths[:2])
for error in navigation_errors:print(error)

if missing or navigation_errors: raise SystemExit(1)
