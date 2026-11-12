/** Run source contract regressions without touching the live lab chain or artifacts. */
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const workspace='/tmp/companion-contract-check-'+process.pid+'-'+Date.now();
function docker(args){
 const result=spawnSync('docker',args,{cwd:root,stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)throw new Error('Docker command failed with status '+result.status);
}
try{
 docker(['compose','exec','-T','ethereum','mkdir','-p',workspace]);
 for(const entry of ['contracts','test','hardhat.config.js','package.json']){
  docker(['compose','cp',path.join('demos/ethereum_lab',entry),'ethereum:'+workspace+'/'+entry]);
 }
 docker(['compose','exec','-T','ethereum','sh','-c',
  'set -eu; cd "$1"; ln -s /app/node_modules node_modules; /app/node_modules/.bin/hardhat test --network hardhat',
  'contract-tests',workspace]);
}catch(error){
 console.error(error);process.exitCode=1;
}finally{
 try{docker(['compose','exec','-T','ethereum','rm','-rf',workspace]);}
 catch(error){console.error(error);process.exitCode=1;}
}
