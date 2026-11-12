"""Build the fixed student/instructor consoles from the course exercise pager."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[2]
template=(ROOT/'demos/bitcoin/reference-ui/wrapper.html').read_text()
# Fixed examples do not claim lanes or need allocation heartbeats.
template=re.sub(r'  // heartbeat\n.*?  if \(!guideEnabled\) return;', '  if (!guideEnabled) return;', template, flags=re.S)
a=template.index('  var lastSent =');b=template.index('  // sessionStorage UI state',a)
template=template[:a]+'''  function beacon(routeId) {
    try { sessionStorage.setItem('bitcoin-last-exercise', routeId); } catch (_) {}
  }

'''+template[b:]
template=template.replace('"/api/" + lab + "/exercises"','"/api/bitcoin/exercises"')
template=template.replace('Spinning up your lab&hellip;','Connecting terminal…').replace('Allocating a lane','').replace('Booting container (','Connecting (')
css='''
<style>
:root { --bg:#f6f7f8;--panel:#fff;--panel-bg:#fff;--panel-soft:#eef1f5;--border:#dce1e6;--border-strong:#c5cdd6;--text:#20262e;--muted:#4e5864;--accent:#24578f;--accent-bg:#e8eef6; }
* { box-sizing:border-box; }
body { min-width:0;background:var(--bg);font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.6; }
#panel { height:auto;min-height:56px;padding:6px 12px;flex-wrap:wrap;gap:8px;font-size:16px; }
#panel .pbtn,#guide-toolbar .gbtn,#guide-toolbar .nav-btn,#guide-toolbar select,#guide-toolbar .lab-tab { display:inline-flex;align-items:center;justify-content:center;min-height:40px;font:inherit;line-height:1.3;padding:7px 10px;border-radius:4px; }
#guide-toolbar { font-size:16px;flex-wrap:wrap;height:auto;padding:8px;gap:8px; }
#guide-body { font-size:16px;line-height:1.6; }
#guide-body .chapter-label,.progress,#guide-body .transition { font-size:14px;text-transform:none;letter-spacing:normal; }
#guide-body h3,#guide-body summary { font-size:16px;text-transform:none;letter-spacing:normal; }
#guide-body .exercise-title { font-size:24px; }
#guide-body code,#guide-body pre { font-size:14px; }
#panel a { color:var(--accent); }
#graph-sync-status { font-size:14px; }
#panel .pbtn:disabled { opacity:.6;cursor:wait; }
#panel .pbtn:hover,#guide-toolbar .gbtn:hover,#guide-toolbar .nav-btn:hover:not([disabled]) { background:var(--accent-bg); }
#guide-wrap,#guide-toolbar,#guide-body { min-width:0; }
#guide-toolbar .lab-tabs { width:100%;overflow-x:auto; }
#guide-toolbar .lab-tab { flex:0 0 auto; }
#guide-toolbar select { max-width:100%;min-width:0; }
#guide-body pre { overflow-x:auto; }

.other-labs { position:relative; margin:0; }
.other-labs nav { position:absolute;right:0;top:100%;background:white;border:1px solid var(--border);z-index:100;min-width:180px;padding:8px; }
.other-labs nav a { display:block;padding:8px;white-space:nowrap; }
@media(max-width:720px){#panel .pbtn,#guide-toolbar .gbtn,#guide-toolbar .nav-btn,#guide-toolbar select,#guide-toolbar .lab-tab{min-height:44px;font-size:16px;}#term-wrap{min-height:220px;}#guide-body{padding:16px;}#guide-body pre{font-size:16px;}}
</style>
'''
links='''<details class="other-labs"><summary class="pbtn">Other labs</summary><nav><a href="/labs/cryptography/">Cryptography</a><a href="/labs/ethereum/">Ethereum</a><a href="/quiz/instructor/">Quiz builder</a><a href="/">Lesson comparisons</a></nav></details>'''
for role,node in [('student',2),('instructor',1)]:
    panel='''<strong>Bitcoin lab</strong><a class="pbtn" href="/labs/bitcoin/student/">Student console</a><a class="pbtn" href="/labs/bitcoin/instructor/">Instructor console</a><span class="grow"></span><a class="pbtn" href="/labs/bitcoin/mempool/" target="_blank" rel="noopener">Mempool</a><a class="pbtn" href="/labs/bitcoin/btc-explorer/" target="_blank" rel="noopener">Explorer</a><a class="pbtn" href="/labs/bitcoin/graph/" target="_blank" rel="noopener">Chain Graph</a><button type="button" class="pbtn" id="graph-sync-btn">Sync graph</button><span id="graph-sync-status" role="status" aria-live="polite"></span><a class="pbtn" href="/labs/bitcoin/student/share/" target="_blank" rel="noopener">Student wallet</a><details class="other-labs"><summary class="pbtn">Peers</summary><nav><a href="/labs/bitcoin/instructor/share/" target="_blank" rel="noopener">Instructor wallet</a><a href="/labs/bitcoin/student/share/" target="_blank" rel="noopener">Student wallet</a></nav></details>'''+links
    html=template
    for key,value in {'TITLE':'Bitcoin '+role+' console','UUID':'shared-'+role,'LAB':'bitcoin','STATION':role,'TTYD_URL':'/labs/bitcoin/node-'+str(node)+'/','GUIDE_ENABLED':'1','PANEL_HTML':panel,'PANEL_SCRIPT':''}.items():html=html.replace('{{'+key+'}}',value)
    html=html.replace('<meta charset="utf-8">','<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">')
    html=html.replace('<div id="panel">',css+'<div id="panel">')
    target=ROOT/'labs/bitcoin'/role/'index.html';target.parent.mkdir(parents=True,exist_ok=True);target.write_text(html)
