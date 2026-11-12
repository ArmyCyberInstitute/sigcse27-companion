const {spawnSync}=require('node:child_process');const path=require('node:path');
for(const args of [
 ['compose','cp',path.join(__dirname,'arcade-session.test.cjs'),'ethereum:/app/test-arcade-session.cjs'],
 ['compose','exec','-T','-e','ETHEREUM_SERVER_ROOT=/app/server','ethereum','node','--test','/app/test-arcade-session.cjs']
]){const result=spawnSync('docker',args,{cwd:path.resolve(__dirname,'..'),stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);}
