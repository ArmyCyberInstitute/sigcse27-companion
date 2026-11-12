const {test}=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');const path=require('node:path');
const {ethers}=require('ethers');
const register=require(path.join(process.env.ETHEREUM_SERVER_ROOT||path.resolve(__dirname,'../demos/ethereum_lab/server'),'arcade-sessions.js'));
const player='0x1111111111111111111111111111111111111111',vault='0x2222222222222222222222222222222222222222';
const burn='0x'+'a'.repeat(64),secondBurn='0x'+'b'.repeat(64),scoreHash='0x'+'c'.repeat(64);
function fixture(t){
 let now=1700000000000;t.mock.method(Date,'now',()=>now);
 const routes=new Map(),receipts=new Map();
 const iface=new ethers.Interface(['event SessionStarted(address indexed player,uint8 indexed gameId,uint256 nonce,uint256 timestamp)','event ScoreSubmitted(address indexed player,uint8 indexed gameId,uint256 indexed nonce,uint256 score,uint256 elapsedMs,uint256 timestamp,bool personalBest,bool globalBest)']);
 function receipt(name,args){const log=iface.encodeEventLog(iface.getEvent(name),args);return {status:1,blockNumber:10,logs:[{address:vault,...log}]};}
 receipts.set(burn,receipt('SessionStarted',[player,1,1,1700000000]));receipts.set(secondBurn,receipt('SessionStarted',[player,2,2,1700000000]));
 receipts.set(scoreHash,receipt('ScoreSubmitted',[player,1,1,73,10000,1700000001,true,true]));
 class Provider {async getTransactionReceipt(hash){return receipts.get(hash);}}
 register({get:(p,f)=>routes.set('GET '+p,f),post:(p,f)=>routes.set('POST '+p,f)},{ethers:{...ethers,JsonRpcProvider:Provider},crypto,getOrCreateSession:req=>req.sid||'browser-a',activeWalletAddress:()=>player,rpcUrl:'unused',config:()=>({arcadeVaultAddress:vault})});
 async function call(method,route,body={},sid='browser-a'){
  let status=200,result;const res={status(n){status=n;return res;},json(data){result=data;return res;}};
  await routes.get(method+' '+route)({body,sid},res);return {status,body:result};
 }
 return {call,advance:ms=>{now+=ms;}};
}
test('recovery returns the original pass; multiple games have separate sessions',async t=>{const f=fixture(t);const one=await f.call('POST','/arcade/session',{txHash:burn,address:player});assert.equal(one.status,200);f.advance(1000);const recovered=await f.call('POST','/arcade/session',{txHash:burn,address:player});assert.equal(recovered.body.token,one.body.token);assert.equal(recovered.body.exp,one.body.exp);await f.call('POST','/arcade/session',{txHash:secondBurn,address:player});assert.equal((await f.call('GET','/arcade/passes')).body.consumedSessions.length,2);});
test('expiry rejects recovery and score submission',async t=>{const f=fixture(t);const p=(await f.call('POST','/arcade/session',{txHash:burn,address:player})).body;f.advance(601000);assert.equal((await f.call('POST','/arcade/session',{txHash:burn,address:player})).status,409);assert.equal((await f.call('POST','/arcade/score',{token:p.token,gameId:1,nonce:1,score:73,elapsedMs:10000})).status,409);});
test('browser binding, token signatures, and game/nonce matching are enforced',async t=>{const f=fixture(t);const p=(await f.call('POST','/arcade/session',{txHash:burn,address:player})).body;assert.equal((await f.call('POST','/arcade/session',{txHash:burn,address:player},'browser-b')).status,403);const score={token:p.token,gameId:1,nonce:1,score:73,elapsedMs:10000};assert.equal((await f.call('POST','/arcade/score',score,'browser-b')).status,403);assert.equal((await f.call('POST','/arcade/score',{...score,token:'tampered'})).status,400);assert.equal((await f.call('POST','/arcade/score',{...score,gameId:2})).status,403);assert.equal((await f.call('POST','/arcade/score',{...score,nonce:2})).status,403);});
test('verified completion is visible on recovery; score confirmations are idempotent',async t=>{const f=fixture(t);const p=(await f.call('POST','/arcade/session',{txHash:burn,address:player})).body;const score={token:p.token,gameId:1,nonce:1,score:73,elapsedMs:10000};assert.equal((await f.call('POST','/arcade/score',score)).status,200);assert.equal((await f.call('POST','/arcade/score',{...score,score:74})).status,409);assert.equal((await f.call('POST','/arcade/score',{...score,txHash:scoreHash})).status,200);assert.equal((await f.call('POST','/arcade/score',{...score,txHash:scoreHash})).status,200);const recovered=await f.call('POST','/arcade/session',{txHash:burn,address:player});assert.equal(recovered.status,200);assert.equal(recovered.body.session.scoreTxHash,scoreHash);});
