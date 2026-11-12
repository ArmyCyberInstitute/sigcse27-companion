const { chromium, expect } = require('@playwright/test');
require('./offline-network.cjs').install(chromium);
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1512,height:1100}});
 const base=process.env.BASE_URL||'http://127.0.0.1:8080';const errors=[];
 page.on('pageerror',e=>{if(e.stack?.includes('/web/explorer.js'))errors.push(e.message);});
 await page.goto(base,{waitUntil:"domcontentloaded"});await page.waitForSelector('#thread-choice option[value="hashing"]',{state:'attached'});
 assert.equal(await page.locator('.preview-card').count(),0);
 assert.deepEqual(await page.locator('#thread-choice option').evaluateAll(os=>os.map(o=>o.value).filter(Boolean)),['trust','hashing','signatures','consensus']);
 assert.equal(await page.locator('#welcome').isVisible(),true);
 await page.locator('#thread-choice').selectOption('hashing');await page.waitForSelector('.preview-card');
 assert.equal(await page.locator('#welcome').isVisible(),false);
 assert.equal(await page.locator('#reader-options').getAttribute('open'),null);
 const panes=await page.locator('#previews').boundingBox();
 assert.ok(panes.width>1400,'Previews use the available width');assert.ok(panes.height>980,'Reader chrome leaves most of the viewport for previews');
 assert.equal(await page.locator('.preview-card').count(),2);
 assert.deepEqual(await page.locator('.preview-card').evaluateAll(ns=>ns.map(n=>n.dataset.stage)),['early-work','final']);
 await page.getByRole('button',{name:'All versions',exact:true}).click();assert.equal(await page.locator('.preview-card').count(),4);
 await page.getByRole('button',{name:'Single',exact:true}).click();assert.equal(await page.locator('.preview-card').count(),1);
 await page.locator('#reader-options > summary').click();
 await page.getByRole('button',{name:'Pilot — toggle preview',exact:true}).click();assert.equal(await page.locator('.preview-card').count(),1);assert.equal(await page.locator('.preview-card').getAttribute('data-stage'),'pilot');
 await page.getByRole('button',{name:'Early + final',exact:true}).click();
 await page.locator('.preview-card').first().getByRole('button',{name:'Source',exact:true}).click();await page.locator('.preview-card pre').waitFor();
 assert.match(await page.locator('.preview-card pre').innerText(),/Symmetric/);
 await page.locator('.preview-card').first().getByRole('button',{name:'Preview',exact:true}).click();
 await page.locator('.preview-card .section-select').first().locator('option').first().waitFor({state:'attached'});
 await page.locator('#reader-options > summary').click();
 await page.locator('#notes').check();
 assert.equal(await page.locator('.preview-card iframe').last().evaluate(frame=>frame.contentWindow.Reveal.getConfig().showNotes),true);
 await page.locator('#notes').uncheck();
 await page.locator('#waypoint').selectOption('example');await page.waitForTimeout(700);
 assert.match(await page.locator('.frame-status').last().textContent(),/Comparison point/);
 await page.locator('#reader-options').evaluate(d=>d.open=false);
 await page.locator('#reader-options > summary').click();
 await page.getByRole('button',{name:'Beamer / Quarto sources',exact:true}).click();
 const earlySource=page.locator('.preview-card[data-stage="early-work"] pre');
 const finalSource=page.locator('.preview-card[data-stage="final"] pre');
 await expect(earlySource).toContainText(/documentclass.*beamer/,{timeout:30000});
 await expect(finalSource).toContainText(/title:.*Hashing and Merkle/,{timeout:30000});
 await page.locator('.preview-card[data-stage="early-work"] .source-file-select').selectOption({label:'beamerthemed2s.sty'});
 await expect(earlySource).toHaveAttribute('data-source',/beamerthemed2s\.sty$/,{timeout:30000});
 await expect(earlySource).toContainText(/usecolortheme/);
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(earlySource).toContainText(/documentclass.*beamer/,{timeout:30000});
 await page.getByRole('tab',{name:/Microlabs/}).click();assert.equal(await page.locator('.preview-card').count(),2);
 assert.deepEqual(await page.locator('.preview-card').evaluateAll(ns=>ns.map(n=>n.dataset.stage)),['pilot','final']);
 await page.getByRole('button',{name:'All versions',exact:true}).click();assert.equal(await page.locator('.preview-card').count(),2);
 await page.locator('#reader-options > summary').click();
 assert.equal(await page.getByRole('button',{name:'Before group review — toggle preview',exact:true}).count(),0);
 await page.locator('#reader-options').evaluate(d=>d.open=false);
 assert.equal(await page.locator('#family').inputValue(),'merkle');assert.equal(await page.locator('.preview-card').count(),2);
 await page.reload({waitUntil:"domcontentloaded"});await page.waitForSelector('.preview-card');assert.equal(await page.locator('#family').inputValue(),'merkle');
 await page.getByRole('tab',{name:/Final labs/}).click();assert.equal(await page.locator('.lab-card').count(),3);
 await page.locator('#thread-switch').selectOption('trust');await page.getByRole('tab',{name:/Microlabs/}).click();assert.match(await page.locator('.empty').innerText(),/No microlabs for this topic/);
 await page.locator('#thread-switch').selectOption('consensus');await page.getByRole('tab',{name:'Lessons',exact:true}).click();assert.equal(await page.locator('.artifact-select').count(),2);
 await page.locator('.preview-card[data-stage="final"] .card-options > summary').click();
 await page.locator('.preview-card[data-stage="final"] .artifact-select').selectOption({index:1});
 assert.match(await page.locator('.preview-card[data-stage="final"] .card-title').innerText(),/Ethereum/);
 await page.locator('.card-options[open]').evaluateAll(ds=>ds.forEach(d=>d.open=false));
 await page.screenshot({path:'/tmp/explorer-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.goto(base,{waitUntil:"domcontentloaded"});await page.waitForSelector('#thread-choice option[value="hashing"]',{state:'attached'});await page.locator('#thread-choice').selectOption('hashing');await page.waitForSelector('.preview-card');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 const targets=await page.locator('.reader-bar button,.card-tools button,.card-tools summary').evaluateAll(ns=>ns.filter(n=>n.checkVisibility()).map(n=>({height:n.getBoundingClientRect().height,font:parseFloat(getComputedStyle(n).fontSize)})));
 assert.ok(targets.every(t=>t.height>=44&&t.font>=16),'Mobile actions must be legible and touch sized');
 await page.screenshot({path:'/tmp/explorer-mobile.png',fullPage:true});
 // Disclosures inherit document styles too; keep their summaries level with buttons.
 for(const width of [320,390,768,1024,1512]){
   await page.setViewportSize({width,height:1000});
   for(const kind of ['lessons','labs']){
     await page.locator('[data-kind="'+kind+'"]').click();
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow at '+width+'px');
     const groups=await page.locator('.card-tools,.lab-actions').evaluateAll(ns=>ns.map(n=>({
       isPreview:n.classList.contains('card-tools'),
       actions:[...n.children].map(c=>(c.tagName==='DETAILS'?c.querySelector('summary'):c).getBoundingClientRect()).map(r=>({top:r.top,height:r.height}))
     })));
     for(const group of groups){
       assert.ok(group.actions.every(a=>a.height>=(width<=720?44:40)),'Touch target height at '+width+'px');
       const heights=group.actions.map(a=>a.height);
       assert.ok(Math.max(...heights)-Math.min(...heights)<1,'Equal action heights at '+width+'px');
       if(group.isPreview){
         const tops=group.actions.map(a=>a.top);
         assert.ok(Math.max(...tops)-Math.min(...tops)<1,'Preview actions align at '+width+'px');
       }
     }
   }
 }
 assert.deepEqual(errors,[]);
 if(!process.env.UI_ONLY){
   for(const route of ['/healthz','/labs/cryptography/_stcore/health','/labs/bitcoin/node-1/','/labs/bitcoin/node-2/','/labs/ethereum/','/labs/ethereum/api/config.json','/labs/ethereum/lab-api/session','/quiz/instructor/','/quiz/student/']){
     const response=await page.request.get(base+route);assert.equal(response.status(),200,route);
   }
   const publicCatalog=await (await page.request.get(base+'/api/bitcoin/exercises')).json();
   assert.equal(publicCatalog.intro.labs.length,3);
   assert.ok(publicCatalog.exercises.every(e=>!e.id.startsWith('lab3')&&!e.id.startsWith('lab4')&&!e.id.startsWith('lab5')));
   assert.ok(!publicCatalog.evidence);
   function checkFields(v){if(Array.isArray(v))v.forEach(checkFields);else if(v&&typeof v==='object')for(const [k,x]of Object.entries(v)){assert.ok(!['solution','solutions','answer_key','answers','record','evidence'].includes(k),k);checkFields(x);}}
   checkFields(publicCatalog);
   for(const route of ['/docs/BITCOIN_FORENSICS.html','/source/docs/BITCOIN_FORENSICS.md','/labs/bitcoin/instructor/share/v34-answers.json','/labs/bitcoin/instructor/share/v35-state.json','/labs/bitcoin/student/share/catalog.json','/labs/bitcoin/instructor/share/other/file','/source/demos/bitcoin/INSTRUCTOR_SOLUTION_GUIDE.md','/demos/ethereum_lab/docs/instructor/INSTRUCTOR_LAB_SCENARIOS.md','/labs/ethereum/docs/instructor/INSTRUCTOR_LAB_SCENARIOS.md']){
     assert.equal((await page.request.get(base+route)).status(),404,'Solution/evidence route is unavailable: '+route);
   }
   // The optional 3D page renders from classroom cache without external RPC setup.
   const threeD=await browser.newPage();const threeDErrors=[];
   threeD.on('pageerror',error=>threeDErrors.push(error.message));
   await threeD.goto(base+'/labs/ethereum/chain-3d?l2=1',{waitUntil:'domcontentloaded'});
   await threeD.getByRole('heading',{name:'Connect to a Layer 2 Chain',exact:true}).waitFor();
   assert.equal(await threeD.getByRole('link',{name:'Arbitrum',exact:true}).count(),0);
   assert.equal(await threeD.getByRole('link',{name:'Optimism',exact:true}).count(),1);
   assert.equal(await threeD.getByRole('link',{name:'Base',exact:true}).count(),1);
   await threeD.locator('canvas, [data-graphics-unavailable]').first().waitFor();await threeD.waitForTimeout(600);
   if(await threeD.locator('[data-graphics-unavailable]').count()){
     await threeD.getByRole('link',{name:'Open chain explorer',exact:true}).click();
     await threeD.getByRole('button',{name:/Smart Contract Lab/}).waitFor();
   }
   assert.deepEqual(threeDErrors,[]);await threeD.close();
   // The Bitcoin wrapper is served at its real subdirectory, including assets and both terminals.
   const bitcoin=await browser.newPage();const bitcoinFailures=[];let bitcoinFrames=0;
   bitcoin.on('response',r=>{if(r.status()>=400)bitcoinFailures.push(r.url());});
   bitcoin.on('pageerror',e=>bitcoinFailures.push(e.message));
   bitcoin.on('websocket',ws=>ws.on('framereceived',()=>bitcoinFrames++));
   await bitcoin.goto(base+'/labs/bitcoin/',{waitUntil:'domcontentloaded'});
   await bitcoin.frameLocator('#term').locator('.xterm-screen').waitFor();
   await expect.poll(()=>bitcoinFrames,{timeout:30000}).toBeGreaterThan(0);
   assert.ok(bitcoinFrames>0,'Embedded Bitcoin terminals receive output');
   assert.deepEqual(bitcoinFailures,[],'Bitcoin wrapper assets and terminals resolve below the prefix');
   for(const width of [320,390,768,1512]){
     await bitcoin.setViewportSize({width,height:1000});
     assert.equal(await bitcoin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Bitcoin console fits '+width+'px');
     const actions=await bitcoin.locator('#panel .pbtn,#guide-toolbar button').evaluateAll(ns=>ns.filter(n=>n.checkVisibility()).map(n=>({font:parseFloat(getComputedStyle(n).fontSize),height:n.getBoundingClientRect().height})));
     assert.ok(actions.every(a=>a.font>=16&&a.height>=(width<=720?44:40)),'Bitcoin controls remain readable at '+width+'px');
   }
   await bitcoin.close();
   // Exercise actual WebSocket upgrades through the shared public port.
   const crypto=await browser.newPage();let cryptoFrames=0;
   crypto.on('websocket',ws=>ws.on('framereceived',()=>cryptoFrames++));
   await crypto.goto(base+'/labs/cryptography/',{waitUntil:'domcontentloaded'});
   await crypto.waitForFunction(()=>document.querySelector('[data-testid="stAppViewContainer"]'));
   for(let i=0;i<50&&!cryptoFrames;i++)await crypto.waitForTimeout(200);
   assert.ok(cryptoFrames>0,'Streamlit WebSocket must receive application data');await crypto.close();
   for(const route of ['/labs/bitcoin/node-1/ws','/labs/bitcoin/node-2/ws','/labs/ethereum/ws/terminal']){
     const result=await page.evaluate(route=>new Promise(resolve=>{
       const ws=new WebSocket(location.origin.replace(/^http/,'ws')+route,route.includes('bitcoin')?'tty':undefined);
       const timer=setTimeout(()=>{ws.close();resolve(false);},10000);
       ws.onopen=()=>{clearTimeout(timer);ws.close();resolve(true);};ws.onerror=()=>{clearTimeout(timer);resolve(false);};
     }),route);assert.equal(result,true,route+' must upgrade');
   }
   // A disconnect during the proxy's upstream handshake must not kill Node.
   for(let i=0;i<8;i++)await page.evaluate(()=>new Promise(resolve=>{
     const ws=new WebSocket(location.origin.replace(/^http/,'ws')+'/labs/ethereum/ws/terminal');
     ws.onopen=()=>{ws.close();resolve();};ws.onerror=()=>resolve();setTimeout(resolve,3000);
   }));
   await page.waitForTimeout(1000);
   assert.equal((await page.request.get(base+'/labs/ethereum/lab-api/session')).status(),200,'Ethereum survives rapid terminal disconnects');
   const r=await page.request.get(base+'/quiz/instructor/api/banks');assert.equal(r.status(),200);assert.equal((await r.json()).banks.length,3);
   const quiz=await browser.newPage();await quiz.goto(base+'/quiz/instructor/',{waitUntil:'domcontentloaded'});assert.match(await quiz.title(),/Quiz|Instructor/);await quiz.close();
 }
 await require('./documentation.cjs')(browser,base);
 await require('./microlabs.cjs')(browser,base);
 await require('./additional-microlabs.cjs')(browser,base);
 await require('./slide-sync.cjs')(browser,base,require('../web/catalog.json'));
 console.log('Explorer layout, comparisons, source, navigation, deep links, mobile, and route checks passed');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
