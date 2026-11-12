"""Build a curated, many-to-many topic catalog from the snapshot sources."""
from pathlib import Path
import json,re,hashlib
R=Path(__file__).resolve().parents[1]
STAGES=[('early-work','Early research'),('pilot','Pilot'),('pre-group-review','Before group review'),('final','Final')]

def lesson(stage,pattern):
    p=next((p for p in (R/'snapshots'/stage/'lessons').rglob(pattern) if p.suffix=='.qmd'),None)
    if p is None:raise ValueError((stage,pattern))
    return str(p.relative_to(R))

def art(path):
    p=R/path;t=p.read_text()
    title=re.search(r'^title:\s*(.+)',t,re.M) if p.suffix=='.qmd' else re.search(r'<title>(.*?)</title>',t,re.S|re.I)
    title=title[1].strip() if title else p.stem
    if title.startswith('"'):
        try:title=json.loads(title)
        except (ValueError,TypeError):title=title.strip('"')
    else:title=title.strip("'")
    title=title.replace('Day 1, Lecture 4: ','')
    if p.suffix=='.tex':
        title=re.search(r'\\title(?:\[[^\]]*\])?\{([^}]+)\}',t)[1]
    if p.suffix=='.html':title=re.sub(r'\s+',' ',title)
    sync_text=re.sub(r'<!--.*?-->','',t,flags=re.S)
    sync_keys=list(dict.fromkeys(key for value in re.findall(r'data-sync-id[=:]\s*[\"\']([^\"\']+)[\"\']',sync_text) for key in value.split())) if p.suffix=='.qmd' else []
    return {'sync_keys':sync_keys,'id':p.stem,'title':title,'source':path,'url':path.removesuffix('.qmd')+'.html' if p.suffix=='.qmd' else 'source/'+path if p.suffix=='.tex' else path,'digest':hashlib.sha256(p.read_bytes()).hexdigest(),'format':'Beamer' if p.suffix=='.tex' else 'Quarto' if p.suffix=='.qmd' else 'HTML'}

def versions(patterns):
    return {s:[art(lesson(s,p)) for p in patterns.get(s,[])] for s,_ in STAGES}

def micro(family):
    paths={'hashing':('micro-hashing/index.html',)*3,'merkle':('merkle-trees/index.html',)*3,'signatures':('asymmetric & signature/asymmetric_signatures_lab.html','asymmetric & signature/asymmetric_signatures_lab.html','signatures/index.html')}[family]
    return {s:([art('snapshots/'+s+'/assets/labs/'+paths[i-1])] if i else []) for i,(s,_) in enumerate(STAGES)}

labs={
 'crypto':{'title':'Applied cryptography','url':'/labs/cryptography/','guide_url':'lab-guide.html#cryptography','guide':'demos/cryptography/README.md','description':'Collisions, entropy, Merkle proofs, encryption, and digital signatures.'},
 'bitcoin':{'title':'Bitcoin network','url':'/labs/bitcoin/','guide_url':'lab-guide.html#bitcoin','guide':'demos/bitcoin/LAB1.md','description':'Student and instructor consoles, exercise navigation, ClassNet, Mempool, Explorer, and Chain Graph.'},
 'ethereum':{'title':'Ethereum & PoS trainer','url':'/labs/ethereum/','guide_url':'lab-guide.html#ethereum','guide':'demos/ethereum_lab/docs/README.md' if (R/'demos/ethereum_lab/docs/README.md').exists() else 'demos/ethereum_lab/README.md','description':'A local chain, contract activities, validator committees, and a teaching model of finality.'},
 'quiz':{'title':'Quiz builder','url':'/quiz/instructor/','guide_url':'lab-guide.html#quiz-engine','guide':'demos/quiz-engine-v2/README.md','description':'Three sample banks, selection templates, quiz generation, attempts, and grading.'}}

threads=[
 {'id':'trust','group':'Introduction','title':'Trust & coordination',
  'lessons':versions({'early-work':['day1_lesson2.qmd'],'pilot':['l03_i3*'],'pre-group-review':['l03_i3*'],'final':['05-IN*']}),
  'microlabs':{},'labs':['bitcoin']},
 {'id':'hashing','group':'Cryptography','title':'Hashing & Merkle trees',
  'lessons':versions({'early-work':['day3_lecture2*','day3_lecture3*'],'pilot':['l05_p2*'],'pre-group-review':['l05_p2*'],'final':['02-CP*']}),
  'microlabs':{'merkle':{'title':'Merkle trees','versions':micro('merkle')}},'labs':['crypto','bitcoin','quiz']},
 {'id':'signatures','group':'Cryptography','title':'Keys & digital signatures',
  'lessons':versions({'early-work':['day3_lecture3*','day3_lecture2*'],'pilot':['l07_p4*'],'pre-group-review':['l07_p4*'],'final':['04-CP*']}),
  'microlabs':{'signatures':{'title':'Encryption & signatures','versions':micro('signatures')}},'labs':['crypto','bitcoin','quiz']},
 {'id':'consensus','group':'Consensus','title':'Consensus → Proof of Stake',
  'lessons':versions({'early-work':['day3_lecture4*','blockchain_day_5_lesson_1.qmd','blockchain_day_5_lesson_3.qmd'],'pilot':['l15_p12*'],'pre-group-review':['l15_p12*'],'final':['03-CM*','02-EF*','01-CM*']}),
  'microlabs':{},'labs':['ethereum','bitcoin','quiz']}
]
beamer_root='snapshots/early-work/beamer/'
for thread in threads:
    if thread['id']=='trust':continue
    path=beamer_root+('reaching_consensus.tex' if thread['id']=='consensus' else 'cryptographic_primitives.tex')
    artifact=art(path)
    artifact['source_files']=[path]+[beamer_root+p.name for p in sorted((R/beamer_root).glob('*.sty'))]
    thread['lessons']['early-work'].append(artifact)
    target=thread['lessons']['final'][-1] if thread['id']=='consensus' else thread['lessons']['final'][0]
    thread['source_pair']={'early-work':artifact['id'],'final':target['id']}

# Semantic comparisons resolve against actual rendered section IDs, not guessed slide numbers.
waypoints=[{'id':'orientation','title':'Framing & objectives','pattern':r'orientation|objectives|roadmap|agenda|framing|overview|hook|motivator'},
 {'id':'mechanism','title':'Core mechanism','pattern':r'what is a cryptographic hash|hash function|merkle trees$|digital signatures$|from encryption to signing|committee|byzantine|centralized model|money'},
 {'id':'example','title':'Examples & activities','pattern':r'worked example|example:|micro.?lab|micro lab|exercise|check on learning|check for understanding|mini walkthrough'},
 {'id':'evidence','title':'References & grounding','pattern':r'^references|^sources|further reading|readings'},
 {'id':'summary','title':'Synthesis','pattern':r'^summary|^recap|takeaways|conclusion'}]
def comparison_digest(artifact, activity=False):
    path=R/artifact['source']
    if not activity:
        # Dates and review flags do not constitute a new lesson treatment.
        body=re.sub(r'^---\s*\n.*?\n---\s*\n','',path.read_text(),count=1,flags=re.S)
        def without_sync(match):
            line=re.sub(r' ?data-sync-(?:id|unmatched)="[^"]*"','',match[0])
            return line.replace(' {}','')
        body=re.sub(r'(?m)^## [^\n]*',without_sync,body)
        text='\n'.join(line.rstrip() for line in body.splitlines()).strip()
        return hashlib.sha256(text.encode()).hexdigest()
    # Compare the entry page and local code/assets, not just its HTML wrapper.
    digest=hashlib.sha256(path.read_bytes())
    for companion in sorted(path.parent.rglob('*')):
        if companion.is_file() and companion!=path and companion.suffix in {'.js','.css','.wasm'}:
            digest.update(str(companion.relative_to(path.parent)).encode())
            digest.update(companion.read_bytes())
    return digest.hexdigest()

def collapse_identical(versions, activity=False):
    previous={}
    for stage,_ in STAGES:
        current={};distinct=[]
        for artifact in versions[stage]:
            fingerprint=comparison_digest(artifact,activity)
            artifact['comparison_digest']=fingerprint
            if fingerprint in previous:
                canonical=previous[fingerprint]
                canonical['also_in'].append(stage)
                canonical['equivalent_sources'].append(artifact['source'])
                current[fingerprint]=canonical
            else:
                artifact['also_in']=[];artifact['equivalent_sources']=[]
                distinct.append(artifact);current[fingerprint]=artifact
        versions[stage]=distinct
        previous=current

# All rendered slide sections are reviewed: a final reference, a correspondence,
# or an explicit absence of a counterpart. Never infer synchronization by index.
final_paths={a['source'] for thread in threads for a in thread['lessons']['final']}
quarto_paths={a['source'] for thread in threads for group in thread['lessons'].values() for a in group if a['format']=='Quarto'}
reference_keys=[]
for path in final_paths:
    text=re.sub(r'<!--.*?-->','',(R/path).read_text(),flags=re.S)
    values=re.findall(r'data-sync-id[=:]\s*["\']([^"\']+)["\']',text)
    if any(len(value.split())!=1 for value in values):raise ValueError('Final slides need one reference ID: '+path)
    reference_keys.extend(values)
if len(reference_keys)!=len(set(reference_keys)):raise ValueError('Duplicate final slide reference ID')
known=set(reference_keys)
for path in quarto_paths:
    text=re.sub(r'<!--.*?-->','',(R/path).read_text(),flags=re.S)
    for heading in re.findall(r'(?m)^## .+$',text):
        match=re.search(r'data-sync-id="([^"]+)"',heading)
        absent='data-sync-unmatched="true"' in heading
        if bool(match)==absent:raise ValueError('Slide correspondence must be reviewed: '+path+' '+heading)
        if '/final/' in path and absent:raise ValueError('Final slide needs a reference ID: '+heading)
        if match and not set(match[1].split())<=known:raise ValueError('Unknown final slide ID: '+heading)
    artifact=art(path)
    if not set(artifact['sync_keys'])<=known:raise ValueError('Unknown title-slide reference: '+path)

for thread in threads:
    collapse_identical(thread['lessons'])
    for family in thread['microlabs'].values():
        collapse_identical(family['versions'],activity=True)

additional_microlabs=[]
for identifier,title,path,description in [
    ('coin-flip','Proof-of-work coin mining','POW_mining_micro/index.html',
     'Race simulated miners, then explore block production and difficulty adjustment.'),
    ('smart-contract','Smart-contract execution','ether-smart-contract-micro/index.html',
     'Step through contract calls, state changes, and a reentrancy attack.'),
    ('mev','MEV, builders, and relays','ether_mev/mev_builders.html',
     'Build and order a block, compare builder bids, and choose a proposer policy.'),
]:
    activity={'id':identifier,'title':title,'description':description,
              'versions':{stage:[] if stage=='early-work' else [art('snapshots/'+stage+'/assets/labs/'+path)] for stage,_ in STAGES}}
    collapse_identical(activity['versions'],activity=True)
    additional_microlabs.append(activity)

result={'stages':[{'id':s,'title':t} for s,t in STAGES],'threads':threads,'labs':labs,'waypoints':waypoints,'additional_microlabs':additional_microlabs}
(R/'web').mkdir(exist_ok=True)
(R/'web/catalog.json').write_text(json.dumps(result,indent=2)+'\n')
print('Catalog:',len(threads),'topics')

(R/'lab-guide.qmd').write_text('---\ntitle: Lab guide\n---\n\n'+(R/'docs/DEMOS.md').read_text().split('\n',1)[1].replace('](BITCOIN.md)','](docs/BITCOIN.md)'))
