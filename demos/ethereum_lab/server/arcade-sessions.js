/** Standalone form of the course arcade pass workflow: verify a burn receipt,
 * issue a session-bound pass, then lock and verify one score per pass. */
module.exports = function registerArcadeSessions(app, { ethers, crypto, getOrCreateSession, activeWalletAddress, rpcUrl, config }) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const iface = new ethers.Interface(['event SessionStarted(address indexed player,uint8 indexed gameId,uint256 nonce,uint256 timestamp)', 'event ScoreSubmitted(address indexed player,uint8 indexed gameId,uint256 indexed nonce,uint256 score,uint256 elapsedMs,uint256 timestamp,bool personalBest,bool globalBest)']);
  const secret = process.env.ARCADE_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
  const passes = new Map();
  const sign = value => crypto.createHmac('sha256', secret).update(value).digest('base64url');
  const tokenFor = claims => { const body = Buffer.from(JSON.stringify(claims)).toString('base64url');return body+'.'+sign(body); };
  const fail = (res, code, error) => res.status(code).json({ ok: false, error });
  function verify(token) {
    const [body,signature] = String(token || '').split('.');
    const expected = sign(body || '');
    if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw Error('Invalid arcade pass');
    return JSON.parse(Buffer.from(body,'base64url'));
  }
  function eventFrom(receipt, eventName) {
    const vault = String(config().arcadeVaultAddress || '').toLowerCase();
    for (const log of receipt?.logs || []) {
      if (String(log.address).toLowerCase() !== vault) continue;
      try { const event = iface.parseLog(log);if(event?.name===eventName)return event.args; } catch (_) {}
    }
    return null;
  }
  app.get('/arcade/session-state', (req,res) => {
    const uuid=getOrCreateSession(req,res);
    res.json({ok:true,consumedSessions:[...passes.values()].filter(p=>p.sessionUuid===uuid).map(({token,...p})=>p)});
  });
  // This alias is separate from /arcade/state, which is the on-chain cache.
  app.get('/arcade/passes', (req,res) => {
    const uuid=getOrCreateSession(req,res);
    res.json({ok:true,consumedSessions:[...passes.values()].filter(p=>p.sessionUuid===uuid).map(({token,...p})=>p)});
  });
  app.post('/arcade/session', async (req,res) => {
    try {
      const uuid=getOrCreateSession(req,res);const address=String(req.body?.address||activeWalletAddress(uuid)||'').toLowerCase();
      const hash=String(req.body?.txHash||'').toLowerCase();
      if(!ethers.isAddress(config().arcadeVaultAddress||''))return fail(res,409,'Arcade vault is not configured');
      if(!/^0x[0-9a-f]{64}$/.test(hash)||!ethers.isAddress(address))return fail(res,400,'Valid transaction hash and wallet required');
      const receipt=await provider.getTransactionReceipt(hash);
      if(!receipt||receipt.status!==1)return fail(res,409,'A successful mined burn transaction is required');
      const event=eventFrom(receipt,'SessionStarted');
      if(!event||event.player.toLowerCase()!==address)return fail(res,403,'Burn receipt does not match this wallet');
      if(activeWalletAddress(uuid)!==address)return fail(res,403,'Wallet does not belong to this browser session');
      const previous=passes.get(hash);
      if(previous&&previous.sessionUuid!==uuid)return fail(res,403,'Pass belongs to another session');
      const now=Math.floor(Date.now()/1000);
      if(previous&&previous.exp<=now)return fail(res,409,'Arcade pass has expired');
      const record=previous||{sessionUuid:uuid,player:address,txHash:hash,gameId:Number(event.gameId),nonce:String(event.nonce),timestamp:Number(event.timestamp),blockNumber:receipt.blockNumber,iat:now,exp:now+600};
      if(!previous){record.token=tokenFor({sid:uuid,sub:address,game:record.gameId,nonce:record.nonce,exp:record.exp,txHash:hash});passes.set(hash,record);}
      const {token,...session}=record;
      return res.json({ok:true,token,game:record.gameId,exp:record.exp,session});
    }catch(e){return fail(res,400,e.message);}
  });
  app.post('/arcade/score', async (req,res) => {
    try {
      const uuid=getOrCreateSession(req,res);const body=req.body||{};const claims=verify(body.token);const pass=passes.get(claims.txHash);
      if(!pass||claims.sid!==uuid||claims.sub!==activeWalletAddress(uuid))return fail(res,403,'Pass does not belong to this browser wallet');
      if(claims.exp<=Date.now()/1000)return fail(res,409,'Arcade pass has expired');
      const gameId=Number(body.gameId),nonce=String(body.nonce),score=Number(body.score),elapsedMs=Number(body.elapsedMs);
      if(gameId!==claims.game||nonce!==claims.nonce)return fail(res,403,'Score does not match the burned game session');
      if(!Number.isInteger(score)||score<1||score>1000000||!Number.isInteger(elapsedMs)||elapsedMs<0||elapsedMs>600000)return fail(res,400,'Score or duration out of range');
      const result={gameId,nonce,score,elapsedMs};
      if(pass.result&&JSON.stringify(pass.result)!==JSON.stringify(result))return fail(res,409,'This pass already locked a different score');
      if(body.txHash){
        const receipt=await provider.getTransactionReceipt(body.txHash);const event=eventFrom(receipt,'ScoreSubmitted');
        if(!receipt||receipt.status!==1||!event||event.player.toLowerCase()!==claims.sub||String(event.nonce)!==nonce||Number(event.gameId)!==gameId||Number(event.score)!==score||Number(event.elapsedMs)!==elapsedMs)return fail(res,409,'Score receipt does not match this pass');
        pass.scoreTxHash=body.txHash;
      }
      pass.result=result;
      return res.json({ok:true,player:claims.sub,...result,txHash:pass.scoreTxHash||null});
    }catch(e){return fail(res,400,e.message);}
  });
};
