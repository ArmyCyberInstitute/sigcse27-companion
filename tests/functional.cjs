/** Live teaching workflows. Run only against the disposable Compose demonstration. */
const {chromium,expect}=require('@playwright/test');
require('./offline-network.cjs').install(chromium);
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const base=process.env.BASE_URL||'http://127.0.0.1:8080';
const output=process.env.TEST_ARTIFACTS_DIR||'/tmp/companion-functional-evidence';fs.mkdirSync(output,{recursive:true});
const requested=(process.env.FUNCTIONAL_LABS||'cryptography,ethereum,quiz,bitcoin').split(',');
const results=[];let browser;
async function json(response,status=200){assert.equal(response.status(),status,(await response.text()).slice(0,1200));return response.json();}
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
async function history(p){return (await Promise.all(p.frames().map(async f=>{try{return (await f.locator('.log-out').allTextContents()).join('\n');}catch{return '';}}))).join('\n');}
async function command(p,value,expected,form=false){
 const input=p.getByRole('textbox',{name:/Enter Command|Terminal command/i}).first();await input.fill(value);
 if(form)await p.getByRole('button',{name:'Run',exact:true}).click();else await input.press('Enter');
 await expect.poll(()=>history(p),{timeout:15000}).toContain(expected);
}
const bitcoinTerminal=require('./bitcoin-terminal.cjs');
async function terminal(p,node,command){return bitcoinTerminal.terminal(p,base,node,command);}

const cases={
 async cryptography(p){
  await p.goto(base+'/labs/cryptography/');await p.getByRole('link',{name:'Hashing',exact:true}).click();
  await command(p,'sha256 teaching sample',sha('teaching sample'));
  await command(p,'sha256 Teaching sample',sha('Teaching sample'));
  assert.notEqual(sha('teaching sample'),sha('Teaching sample'));
  await p.getByRole('link',{name:'Merkle Trees',exact:true}).click();
  await expect(p.getByRole('textbox',{name:/Enter Command|Terminal command/i}).first()).toBeVisible();
  await p.getByRole('link',{name:'Symmetric and Asymmetric Encryption',exact:true}).click();
  await expect(p.getByRole('textbox',{name:/Enter Command|Terminal command/i}).first()).toBeVisible();

 },
 async ethereum(p){
  await p.goto(base+'/labs/ethereum/');await p.getByRole('button',{name:/FT Arcade Lab/}).click();
  // A real browser-created wallet keeps repeated runs independent of earlier passes.
  p.once('dialog',d=>d.accept('Regression wallet '+Date.now()));await p.getByRole('button',{name:/🔑 New/}).click();
  await p.getByRole('button',{name:/Got it.*saved my credentials/}).click();
  // The classroom faucet funds the new wallet through its actual UI challenge.
  await p.getByRole('button',{name:/Top off/}).click();
  const challenge=p.frameLocator('iframe[title="Proof-of-work top-off mining challenge"]');
  for(let round=0;round<5;round++){
   await challenge.locator('#startBtn:visible,#resetBtn:visible').click();
   for(let click=0;click<160;click++){
    if(!(await p.locator('iframe[title="Proof-of-work top-off mining challenge"]').count()))break;
    const status=await challenge.locator('#status').innerText();
    if(status.includes('You win')||await challenge.locator('#resetBtn').isVisible())break;
    await challenge.locator('body').press('m');await p.waitForTimeout(25);
   }
   if(!(await p.locator('iframe[title="Proof-of-work top-off mining challenge"]').count()))break;
   if((await challenge.locator('#status').innerText()).includes('You win'))break;
  }
  await expect(p.locator('iframe[title="Proof-of-work top-off mining challenge"]')).toHaveCount(0,{timeout:40000});
  await p.getByRole('button',{name:/Buy 1 ARC/}).click();await p.getByText(/You bought 1 ARC/).waitFor({timeout:90000});
  await p.getByRole('button',{name:'Approve 1 ARC',exact:true}).click();await p.getByText(/Vault approval is ready/).waitFor({timeout:60000});
  await p.getByRole('button',{name:/^Block Breaker/}).click();await p.getByText('Signed arcade pass issued',{exact:true}).waitFor({timeout:60000});
  await p.getByRole('button',{name:'Launch Block Breaker',exact:true}).click();
  const game=p.frameLocator('iframe[title*="Block Breaker"]');await game.locator('canvas').waitFor();
  // Games report client-attested scores; exercise the real completion handler and on-chain write.
  const gameFrame=p.frames().find(f=>f.url().includes('/arcade-games/block-breaker/'));assert.ok(gameFrame);
  await gameFrame.evaluate(()=>parent.postMessage({source:'ethereum_lab_arcade',type:'arcade-game-complete',gameId:1,name:'Block Breaker',outcome:'complete',score:123,elapsedMs:10000},location.origin));
  await p.getByText(/Score stored on-chain and indexed/).waitFor({timeout:90000});
  const passes=await json(await p.request.get(base+'/api/ethereum/arcade/passes'));assert.ok(passes.consumedSessions.length);
  const cache=await json(await p.request.get(base+'/labs/ethereum/arcade-state'));assert.ok(cache.recentBuys.length&&cache.recentScores.some(s=>Number(s.score)===123));
  const bad=await p.request.post(base+'/api/ethereum/arcade/score',{data:{token:'tampered',gameId:1,nonce:1,score:123,elapsedMs:10000}});assert.equal(bad.status(),400);
  await p.getByRole('dialog',{name:'Block Breaker arcade game'}).getByRole('button',{name:'Close',exact:true}).click();
  await p.getByRole('button',{name:/Tokenization Lab/}).click();
  await p.getByRole('button',{name:'Claim',exact:true}).first().click();
  await p.getByText(/Theme claimed/).waitFor();
  await p.getByRole('button',{name:'Mint All 5 Variants',exact:true}).click();
  await p.getByText(/Minted batch: token IDs/).waitFor({timeout:60000});
  await p.getByRole('button',{name:'Verify ownership',exact:true}).click();
  await p.getByText(/Verified ownership and metadata/).waitFor({timeout:30000});
  const minted=await json(await p.request.get(base+'/api/ethereum/nft/state'));assert.ok(minted.mintedBatches.some(batch=>batch.tokenIds.length===5));

 },
 async quiz(p){
  const banks=(await json(await p.request.get(base+'/quiz/instructor/api/banks'))).banks;assert.equal(banks.length,3);
  const source=banks[0];
  const payload={title:'Regression '+Date.now(),description:'Public demonstration workflow',criteria:{lesson_ids:[source.lesson_id],question_types:['multiple_choice'],difficulty_min:1,difficulty_max:5},question_count:3,selection_policy:'random',timer_minutes:null,attempt_limit:1,result_policy:'score_and_answers_after_grading'};
  const template=(await json(await p.request.post(base+'/quiz/instructor/api/templates',{data:payload}),201)).template;
  const version=(await json(await p.request.post(base+`/quiz/instructor/api/templates/${template.id}/generate`,{data:{random_seed:'functional'}}),201)).quiz_version;
  await json(await p.request.post(base+`/quiz/instructor/api/quiz-versions/${version.id}/publish`));
  await p.goto(base+'/quiz/student/');
  const enroll=p.getByRole('button',{name:/Enroll|Create.*student|Get.*identifier/i});await enroll.click();
  const started=await json(await p.request.post(base+`/quiz/student/api/quizzes/${version.id}/start`),201);const attempt=started.attempt;
  await p.goto(base+`/quiz/student/attempts/${attempt.id}`);
  for(const q of attempt.questions)await p.locator(`input[value="${q.options[0].id}"]`).check();
  await p.getByRole('button',{name:/Submit quiz|Submit attempt|Submit answers/i}).click();
  await expect(p.locator('body')).toContainText(/Score|Results/);
  const graded=await json(await p.request.get(base+`/quiz/student/api/attempts/${attempt.id}`));assert.equal(graded.attempt.status,'graded');
 },
 async bitcoin(p){
  await p.goto(base+'/labs/bitcoin/');await p.frameLocator('#term').locator('.xterm-screen').waitFor();
  const catalog=await json(await p.request.get(base+'/api/bitcoin/exercises'));
  assert.equal(catalog.intro.labs.length,3);
  assert.ok(!catalog.evidence);
  for(const lab of catalog.intro.labs){await p.getByRole('button',{name:lab.title,exact:true}).click();await expect(p.locator('#guide-body')).not.toContainText('No exercises');}
  await p.getByRole('link',{name:'Instructor console',exact:true}).click();await p.frameLocator('#term').locator('.xterm-screen').waitFor();
  const wallet='functional_'+Date.now();
  const mined=await terminal(p,2,`D=~/.${wallet}; mkdir -p "$D"; bitcoind -regtest -daemon -datadir="$D" -rpcport=18543 -port=18544 -fallbackfee=0.0001 >/dev/null; C="bitcoin-cli -regtest -datadir=$D -rpcport=18543"; $C -rpcwait createwallet ${wallet} >/dev/null; A=$($C getnewaddress); $C generatetoaddress 11 "$A" >/dev/null; $C getbalance; $C stop >/dev/null`);
  assert.match(mined,/50\.00000000/);
  const receiver=await terminal(p,2,`bitcoin-cli createwallet ${wallet} >/dev/null; bitcoin-cli -rpcwallet=${wallet} getnewaddress`);
  const match=receiver.match(/\bbc1[a-z0-9]{20,}\b/);assert.ok(match,'Receiving address missing: '+receiver);const address=match[0];
  const cli='bitcoin-cli -rpcwallet=treasury';
  const sent=await terminal(p,1,`bitcoin-cli loadwallet treasury >/dev/null 2>&1 || true; ${cli} sendtoaddress ${address} 1; ${cli} generatetoaddress 1 "$(${cli} getnewaddress)" >/dev/null`);
  const txMatch=sent.match(/\b[a-f0-9]{64}\b/);assert.ok(txMatch,'Transaction hash missing: '+sent);const txid=txMatch[0];
  await expect.poll(async()=>await terminal(p,2,`bitcoin-cli -rpcwallet=${wallet} getbalance`),{timeout:30000}).toMatch(/1\.00000000/);
  await expect.poll(async()=>{const r=await p.request.get(base+'/labs/bitcoin/mempool/api/tx/'+txid);if(!r.ok())return false;const tx=await r.json();return tx.txid===txid&&tx.status.confirmed;},{timeout:30000}).toBe(true);
  await expect.poll(async()=>(await json(await p.request.get(base+'/labs/bitcoin/graph/api/status'))).state,{timeout:120000}).toBe('ready');
  const beforeSync=await json(await p.request.get(base+'/labs/bitcoin/graph/api/status'));
  const syncRequest=p.waitForResponse(r=>r.url().endsWith('/graph/api/sync')&&r.request().method()==='POST');
  await p.getByRole('button',{name:'Sync graph',exact:true}).click();
  assert.equal((await syncRequest).status(),202);
  await expect(p.getByRole('button',{name:'Syncing graph…',exact:true})).toBeDisabled();
  const repeated=await json(await p.request.post(base+'/labs/bitcoin/graph/api/sync'),202);assert.equal(repeated.started,false);
  await expect.poll(async()=>{const s=await json(await p.request.get(base+'/labs/bitcoin/graph/api/status'));return s.state==='ready'&&s.build_id!==beforeSync.build_id;},{timeout:900000,intervals:[3000]}).toBe(true);
  await expect(p.locator('#graph-sync-status')).toContainText('Graph at block');
  const indexedTx=await json(await p.request.get(base+'/labs/bitcoin/graph/api/search?q='+txid));assert.ok(indexedTx.matches.some(m=>m.id===txid),'New confirmed transfer is indexed after sync');
  const sharedAddress=(await (await p.request.get(base+'/labs/bitcoin/instructor/share/address.txt')).text()).trim();assert.ok(sharedAddress);const detail=await json(await p.request.get(base+'/labs/bitcoin/graph/api/address/'+sharedAddress));assert.ok(detail.nodes.length&&detail.edges.length);
  for(const route of ['/labs/bitcoin/mempool/','/labs/bitcoin/btc-explorer/','/labs/bitcoin/graph/']){await p.goto(base+route);await expect(p.locator('body')).not.toBeEmpty();}
  await p.goto(base+'/labs/bitcoin/graph/?start='+sharedAddress);await p.locator('#cy canvas').first().waitFor();await expect(p.locator('#status-chip')).toContainText('evidence graph');
 }
};
(async()=>{browser=await chromium.launch();for(const name of requested){const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.tracing.start({screenshots:true,snapshots:true});const p=await context.newPage();p.setDefaultTimeout(30000);const errors=[];p.on('pageerror',e=>errors.push(e.message));const started=Date.now();try{const readiness={ethereum:'/labs/ethereum/api/config.json',bitcoin:'/api/bitcoin/exercises',cryptography:'/labs/cryptography/_stcore/health',quiz:'/quiz/instructor/api/banks'};await expect.poll(async()=>{try{return (await p.request.get(base+readiness[name])).status();}catch{return 0;}},{timeout:120000}).toBe(200);await cases[name](p);assert.deepEqual(errors,[]);results.push({lab:name,status:'passed',seconds:(Date.now()-started)/1000});console.log('PASS',name);}catch(error){results.push({lab:name,status:'failed',error:String(error),stack:error.stack,consoleErrors:errors,url:p.url()});await p.screenshot({path:path.join(output,name+'-failure.png'),fullPage:true});console.error('FAIL',name,String(error));}finally{await context.tracing.stop({path:path.join(output,name+'-trace.zip')});await context.close();}}await browser.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');if(results.some(r=>r.status!=='passed'))process.exitCode=1;})().catch(error=>{console.error(error);process.exitCode=1;browser?.close();});
