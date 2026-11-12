/** Learner workflows against a disposable shared Ethereum demonstration. */
const {chromium,expect}=require('@playwright/test');
require('./offline-network.cjs').install(chromium);
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {newWallet,topOff}=require('./ethereum-helpers.cjs');
const base=process.env.BASE_URL||'http://127.0.0.1:8080';
const output=process.env.TEST_ARTIFACTS_DIR||'/tmp/ethereum-extended-evidence';fs.mkdirSync(output,{recursive:true});
let browser;const results=[];
async function json(page,route){const r=await page.request.get(base+route);assert.equal(r.status(),200,route);return r.json();}
async function wallet(context,label,{fund=true}={}){const page=await context.newPage();await page.goto(base+'/labs/ethereum/');const address=await newWallet(page,label);if(fund){await topOff(page);await expect.poll(()=>balance(page),{timeout:30000}).toBeGreaterThan(1000000000000000000n);}return {page,address};}
async function balance(page){return BigInt((await json(page,'/labs/ethereum/lab-api/session/wallet-balance')).balanceWei);}
const cases={
 async sessions(context){
  const {page:p}=await wallet(context,'Multiple arcade sessions');
  await p.getByRole('button',{name:/FT Arcade Lab/}).click();
  for(let i=0;i<2;i++){if(i){await topOff(p);await expect.poll(()=>balance(p),{timeout:30000}).toBeGreaterThan(100000000000000000000n);}console.log('Session setup: buying ARC',i+1);await p.getByRole('button',{name:/Buy 1 ARC/}).click();await p.getByText(/You bought 1 ARC/).waitFor({timeout:90000});}
  for(const game of ['Block Breaker','Mempool Invaders']){
   await p.getByRole('button',{name:'Approve 1 ARC',exact:true}).click();await p.getByText(/Vault approval is ready/).waitFor({timeout:90000});
   await p.getByRole('button',{name:new RegExp('^'+game)}).click();await p.getByText('Signed arcade pass issued',{exact:true}).waitFor({timeout:90000});
  }
  await expect(p.getByRole('button',{name:'Continue',exact:true})).toHaveCount(2,{timeout:30000});
  const passes=await json(p,'/api/ethereum/arcade/passes');assert.equal(passes.consumedSessions.length,2);assert.equal(new Set(passes.consumedSessions.map(s=>s.gameId)).size,2);
  await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  // Exercise the browser countdown with a controlled clock; backend expiry is tested separately.
  await p.clock.setFixedTime(new Date(Date.now()+601000));
  await p.reload();await p.getByRole('button',{name:/FT Arcade Lab/}).click();
  await expect(p.getByRole('button',{name:'Expired',exact:true})).toHaveCount(2);
  assert.equal(await p.getByRole('button',{name:'Continue',exact:true}).count(),0);
 },
 async transfers(context){
  const sender=await wallet(context,'ARC sender');const p=sender.page;
  const receiverContext=await browser.newContext();
  try{
   const receiver=await wallet(receiverContext,'ARC receiver',{fund:false});
   await p.getByRole('button',{name:/FT Arcade Lab/}).click();await p.getByRole('button',{name:/Buy 1 ARC/}).click();await p.getByText(/You bought 1 ARC/).waitFor({timeout:90000});
   await p.getByRole('button',{name:/Dashboard/}).first().click();await p.getByRole('button',{name:/Send Transaction/}).click();
   const asset=p.locator('select:has(option[value="arc"])');await expect(asset.locator('option[value="arc"]')).toBeEnabled({timeout:30000});await asset.selectOption('arc');
   await p.getByPlaceholder('0x... or pick a classmate above').fill(receiver.address);
   const amount=p.getByPlaceholder('1',{exact:true});await amount.fill('1.5');
   let broadcasts=0;p.on('request',request=>{if(request.url().endsWith('/rpc-write')){let data;try{data=request.postDataJSON();}catch{}if((Array.isArray(data)?data:[data]).some(r=>r?.method==='eth_sendRawTransaction'))broadcasts++;}});
   await p.getByRole('button',{name:/Send ARC/}).click();await p.getByText('ARC transfers must be whole tokens:',{exact:false}).waitFor();assert.equal(broadcasts,0);
   await amount.fill('1');await p.getByRole('button',{name:/Send ARC/}).click();await p.getByText('Sent 1 ARC to',{exact:false}).waitFor({timeout:90000});assert.equal(broadcasts,1);
   await expect.poll(async()=>{const state=await json(p,'/labs/ethereum/arcade-state');return String(state.balances?.[receiver.address.toLowerCase()]||'0');},{timeout:30000}).toBe('1000000000000000000');
  }finally{await receiverContext.close();}
 },
 async marketplace(context){
  const seller=await wallet(context,'Marketplace seller');const p=seller.page;
  await p.getByRole('button',{name:/Tokenization Lab/}).click();
  await p.getByRole('button',{name:'Claim',exact:true}).first().click();await p.getByText(/Theme claimed/).waitFor();
  await p.getByRole('button',{name:'Mint All 5 Variants',exact:true}).click();await p.getByText(/Minted batch: token IDs/).waitFor({timeout:90000});
  await p.getByRole('button',{name:/NFT Marketplace/}).click();
  const listRow=p.getByRole('button',{name:'List',exact:true}).first().locator('..');
  await listRow.getByPlaceholder('ETH',{exact:true}).fill('0.25');await listRow.getByRole('button',{name:'List',exact:true}).click();
  await p.getByText(/Listed token #\d+ for 0.25 ETH/).waitFor({timeout:90000});
  await expect.poll(async()=>{const s=await json(p,'/labs/ethereum/marketplace-state');return s.listings.some(l=>l.seller.toLowerCase()===seller.address.toLowerCase());},{timeout:30000}).toBe(true);
  const snapshot=await json(p,'/labs/ethereum/marketplace-state');
  const listing=snapshot.listings.find(l=>l.seller.toLowerCase()===seller.address.toLowerCase());assert.ok(listing);
  const sellerBefore=await balance(p);
  const buyerContext=await browser.newContext({viewport:{width:1440,height:1000}});
  try{
   const buyer=await wallet(buyerContext,'Marketplace buyer');const b=buyer.page;const buyerBefore=await balance(b);
   await b.getByRole('button',{name:/NFT Marketplace/}).click();
   const card=b.locator('div').filter({has:b.getByText('#'+listing.tokenId+' · seller',{exact:false})}).filter({has:b.getByRole('button',{name:'Buy',exact:true})}).last();
   await card.getByRole('button',{name:'Buy',exact:true}).click();await b.getByText('Bought token #'+listing.tokenId+'.',{exact:false}).waitFor({timeout:90000});
   await expect.poll(async()=>{const s=await json(b,'/labs/ethereum/marketplace-state');return s.tokens[listing.tokenId]?.owner;},{timeout:30000}).toBe(buyer.address.toLowerCase());
   await expect.poll(async()=>Number((await balance(p))-sellerBefore),{timeout:30000}).toBeGreaterThan(249000000000000000);
   await expect.poll(async()=>buyerBefore-(await balance(b)),{timeout:30000}).toBeGreaterThanOrEqual(250000000000000000n);
   await b.setViewportSize({width:390,height:844});assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }finally{await buyerContext.close();}
 },
 async contract(context){
  const {page:p}=await wallet(context,'Contract author');await p.getByRole('button',{name:/Smart Contract Lab/}).click();
  const name='ReviewCounter'+Date.now();
  const source=`// SPDX-License-Identifier: MIT\npragma solidity ^0.8.19;\ncontract ${name} { uint256 public value; function setValue(uint256 next) external { value = next; } }`;
  await p.locator('textarea').first().fill(source);await p.getByRole('button',{name:/Compile/}).first().click();
  await p.getByText('Compiled '+name,{exact:false}).waitFor({timeout:90000});
  await p.getByRole('button',{name:/Deploy from my wallet/}).click();await p.getByText('Deployed '+name+' to',{exact:false}).waitFor({timeout:90000});
  const write=p.getByText('setValue',{exact:true}).locator('..');await write.getByPlaceholder('uint256 next').fill('73');await write.getByRole('button',{name:'Send',exact:true}).click();
  await write.getByText(/confirmed/).waitFor({timeout:90000});
  const read=p.getByText('value',{exact:true}).locator('..');await read.getByRole('button',{name:'Read',exact:true}).click();await read.getByText('→ 73',{exact:true}).waitFor({timeout:30000});
 },
 async validator(context){
  const {page:p,address}=await wallet(context,'Validator reviewer',{fund:false});await p.getByRole('button',{name:/Beacon Chain Lab/}).click();
  await p.getByRole('button',{name:'Join',exact:true}).first().click();await p.getByText(/Joined!|Already joined/).waitFor({timeout:90000});
  const before=await json(p,'/labs/ethereum/beacon-state');
  const attest=p.getByRole('button',{name:'Attest',exact:true}).first();await expect(attest).toBeEnabled({timeout:120000});await attest.click();
  await p.getByText(/Attestation (included|submitted)|Attested to block/).waitFor({timeout:90000});
  await expect.poll(async()=>{const s=await json(p,'/labs/ethereum/beacon-state');return (s.validatorAttestations?.[address.toLowerCase()]||[]).length;},{timeout:30000}).toBeGreaterThan(0);
  await expect.poll(async()=>(await json(p,'/labs/ethereum/beacon-state')).lastFinalizedIndex,{timeout:120000}).toBeGreaterThan(before.lastFinalizedIndex);
 },
 async arcade(context){
  const {page:p,address}=await wallet(context,'Arcade player');await p.getByRole('button',{name:/FT Arcade Lab/}).click();
  await p.getByRole('button',{name:/Buy 1 ARC/}).click();await p.getByText(/You bought 1 ARC/).waitFor({timeout:90000});
  await p.getByRole('button',{name:'Approve 1 ARC',exact:true}).click();await p.getByText(/Vault approval is ready/).waitFor({timeout:90000});
  await p.getByRole('button',{name:/^Block Breaker/}).click();await p.getByText('Signed arcade pass issued',{exact:true}).waitFor({timeout:90000});
  // The visualization cache can still be indexing earlier burns. Compare the
  // authoritative pass ledger and wallet nonce instead of its global row count.
  const passTransactions = async () => (await json(p,'/api/ethereum/arcade/passes')).consumedSessions.map(s=>s.txHash).sort();
  const nonce = async () => {
   const response=await p.request.post(base+'/labs/ethereum/rpc-write',{data:{jsonrpc:'2.0',id:1,method:'eth_getTransactionCount',params:[address,'latest']}});
   assert.equal(response.status(),200);const body=await response.json();assert.ok(body.result,JSON.stringify(body));return body.result;
  };
  const beforeRecovery=await passTransactions();assert.equal(beforeRecovery.length,1);
  const beforeNonce=await nonce();
  await p.reload();await p.getByRole('button',{name:/FT Arcade Lab/}).click();
  await p.getByRole('button',{name:'Continue',exact:true}).first().click();
  await p.getByText('Arcade pass recovered. You can play the client-side game now.',{exact:true}).waitFor();
  assert.deepEqual(await passTransactions(),beforeRecovery,'Recovery must reuse the same burn transaction');
  assert.equal(await nonce(),beforeNonce,'Recovery must not send another transaction or burn ARC');
  await p.getByRole('button',{name:'Launch Block Breaker',exact:true}).click();
  const game=p.frameLocator('iframe[title*="Block Breaker"]');await game.locator('canvas').waitFor();
  for(let life=0;life<3;life++){
   await game.locator('#launchButton').click();
   await game.locator('body').press('ArrowLeft');
   // Play through normal controls; do not modify game state or forge completion events.
   await game.locator('canvas').focus();await p.keyboard.down('ArrowLeft');await p.waitForTimeout(900);await p.keyboard.up('ArrowLeft');
   await expect(game.locator('#overlay')).toBeVisible({timeout:60000});
   await expect(game.locator('#overlayTitle')).toHaveText(/Ball Lost|Game Over/);
   if((await game.locator('#overlayTitle').innerText())==='Game Over')break;
  }
  await expect(game.locator('#overlayTitle')).toHaveText('Game Over');
  assert.ok(Number(await game.locator('#scoreText').innerText())>0,'Normal play must hit bricks and produce a real score');
  await p.getByText(/Score stored on-chain and indexed/).waitFor({timeout:90000});
  await p.getByRole('dialog',{name:'Block Breaker arcade game'}).getByRole('button',{name:'Close',exact:true}).click();
  await expect(p.getByRole('button',{name:'Completed',exact:true})).toBeVisible({timeout:30000});
  assert.equal(await p.getByRole('button',{name:'Continue',exact:true}).count(),0,'Completed passes are not resumable');
  await expect(p.getByRole('button',{name:'Score recorded',exact:true})).toBeDisabled();
  await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 }
};
(async()=>{
 browser=await chromium.launch();
 for(const name of (process.env.ETHEREUM_CHECKS||'marketplace,contract,validator,arcade,transfers,sessions').split(',')){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.tracing.start({screenshots:true,snapshots:true});
  const started=Date.now();console.log('START',name);
  try{await cases[name](context);results.push({name,status:'passed',seconds:(Date.now()-started)/1000});console.log('PASS',name);}
  catch(error){results.push({name,status:'failed',error:String(error),stack:error.stack});console.error('FAIL',name,String(error));for(const [i,p]of context.pages().entries())await p.screenshot({path:path.join(output,name+'-'+i+'-failure.png'),fullPage:true}).catch(()=>{});}
  finally{await context.tracing.stop({path:path.join(output,name+'-trace.zip')});await context.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');}
 }
 await browser.close();if(results.some(r=>r.status==='failed'))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;browser?.close();});
