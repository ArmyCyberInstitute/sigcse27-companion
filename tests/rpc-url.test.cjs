const test=require('node:test');const assert=require('node:assert/strict');
test('RPC paths resolve once under the deployment prefix',async()=>{
 const {resolveRpcEndpoint}=await import('../demos/ethereum_lab/frontend/src/lib/rpc-url.mjs');
 const origin='http://localhost:8080';const base='/labs/ethereum/';
 assert.equal(resolveRpcEndpoint('/rpc-write',base,origin),origin+base+'rpc-write');
 assert.equal(resolveRpcEndpoint('/labs/ethereum/rpc-write',base,origin),origin+base+'rpc-write');
 assert.equal(resolveRpcEndpoint(origin+base+'rpc-write',base,origin),origin+base+'rpc-write');
 assert.equal(resolveRpcEndpoint('/rpc-write','/',origin),origin+'/rpc-write');
});
