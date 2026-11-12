/** Persistent terminal and course keyboard regressions for the shared Bitcoin demo. */
const {chromium,expect}=require('@playwright/test');const assert=require('node:assert/strict');
require('./offline-network.cjs').install(chromium);
const t=require('./bitcoin-terminal.cjs');const base=process.env.BASE_URL||'http://127.0.0.1:8080';
const stateSource=require('node:zlib').gzipSync(require('node:fs').readFileSync(require('node:path').join(__dirname,'zellij_state.py'))).toString('base64');
const statePath='/tmp/companion-zellij-state-'+process.pid+'-'+Date.now()+'.py';
// Install once through the browser terminal, including for a VM. Subsequent
// commands stay short and need neither Docker access nor server-side fixtures.
async function installStateHelper(target){
 const command=`python3 -c "import base64,gzip,pathlib; pathlib.Path('${statePath}').write_bytes(gzip.decompress(base64.b64decode('${stateSource}'))); print('STATE_HELPER_READY')"`;
 assert.match(await t.command(target,command),/STATE_HELPER_READY/);
}
const stateCommand=mode=>`python3 '${statePath}' ${mode}`;
const countCommand=stateCommand('counts');
async function counts(page){const out=await t.command(page,countCommand);const m=out.match(/COUNTS=(\d+),(\d+)/);assert.ok(m,out);return m.slice(1).map(Number);}
// Keyboard actions change Zellij asynchronously. A browser key event completing
// is not an acknowledgement from the terminal. Wait for parsed terminal output
// between keys so commands cannot run in the previous pane or input mode.
async function keys(target,...values){
 const keyboard=target.keyboard||target.page().keyboard;
 for(const value of values){
  const before=await t.renderVersion(target);
  await keyboard.press(value);
  await expect.poll(()=>t.renderVersion(target),{timeout:30000}).toBeGreaterThan(before);
  const footer=async()=>(await t.text(target)).split('\n').slice(-2).join(' ');
  if(value==='Control+g'){
   await expect.poll(footer,{timeout:30000}).toMatch(/PANE.*RESIZE/);
  }else if(value==='p'||value==='t'){
   await expect.poll(footer,{timeout:30000}).toMatch(/New.*Close/);
  }else if(!value.startsWith('Alt+')){
   await expect.poll(async()=>!/PANE|RESIZE|New|Close/.test(await footer()),{timeout:30000}).toBe(true);
  }
 }
}
async function paneId(target){
 const output=await t.command(target,'printf "ACTIVE_PANE=%s\\n" "$ZELLIJ_PANE_ID"');
 const match=output.match(/ACTIVE_PANE=(\d+)/);assert.ok(match,output);return match[1];
}
async function fullscreen(target){
 const output=await t.command(target,stateCommand('fullscreen'));
 const match=output.match(/^FULLSCREEN=(true|false)$/m);assert.ok(match,output);
 return match[1]==='true';
}
// Reattach can restore the right pane by itself. Avoid moving away from it.
// Every navigation step is acknowledged by the shell that actually receives
// input; sending a sequence of tab shortcuts does not prove where it landed.
async function selectTestPane(target,position,expectedPane){
 if(await paneId(target)===expectedPane)return;
 await target.locator('.xterm-helper-textarea').focus();
 await keys(target,'Control+g','t',String(Math.min(position,9)));
 let actual=await paneId(target);
 for(let i=9;i<position;i++){
  await keys(target,'Control+g','t','ArrowRight');actual=await paneId(target);
 }
 assert.equal(actual,expectedPane,'Tab navigation must return to the original shell pane');
}
(async()=>{
 const browser=await chromium.launch();
 try{
  // Leave a student session at a narrow size before the desktop reconnect.
  const narrowContext=await browser.newContext({viewport:{width:340,height:720}});
  try{
   const student=await t.connect(narrowContext,base,2);
   assert.ok(await student.evaluate(()=>window.term.cols)<60,'Student readiness is exercised in a narrow terminal');
   console.log('PASS Zellij narrow student connection');
  }finally{await narrowContext.close();}
  for(const [node,role] of [[1,'instructor'],[2,'student']]){
   const context=await browser.newContext({viewport:{width:1600,height:1100}});
   let page=await t.connect(context,base,node);await installStateHelper(page);const before=await counts(page);const originalPane=await paneId(page);
   await page.locator('.xterm-helper-textarea').focus();await keys(page,'Control+g','t','n');
   // NewTab is asynchronous. Acknowledge it before writing shell state, then
   // prove the receiving shell is different from the starting one.
   await expect.poll(()=>counts(page),{timeout:30000}).toEqual([before[0]+1,before[1]+1]);
   const testPane=await paneId(page);assert.notEqual(testPane,originalPane);
   const nonce='station_'+node+'_'+Date.now();
   assert.match(await t.command(page,`export ZELLIJ_CHECK_VALUE=${nonce}; printf 'SESSION=%s VALUE=%s\\n' "$ZELLIJ_SESSION_NAME" "$ZELLIJ_CHECK_VALUE"`),new RegExp('SESSION=bitcoin VALUE='+nonce));
   await page.reload();await t.ready(page);await selectTestPane(page,before[0]+1,testPane);
   assert.match(await t.command(page,'printf "VALUE=%s\\n" "$ZELLIJ_CHECK_VALUE"'),new RegExp('VALUE='+nonce));
   // Split using the original keyboard map, then fullscreen the new pane for readable output.
   await keys(page,'Alt+n');await keys(page,'Control+g','p','f');
   await expect.poll(()=>fullscreen(page),{timeout:30000}).toBe(true);
   assert.deepEqual(await counts(page),[before[0]+1,before[1]+2]);
   const splitPane=await paneId(page);assert.notEqual(splitPane,testPane);
   assert.match(await t.command(page,'printf "NEW_PANE=%s\\n" "${ZELLIJ_CHECK_VALUE-unset}"'),/NEW_PANE=unset/);
   assert.deepEqual(await counts(page),[before[0]+1,before[1]+2]);
   await keys(page,'Control+g','p','f');await expect.poll(()=>fullscreen(page),{timeout:30000}).toBe(false);
   await keys(page,'Alt+h');await expect.poll(()=>paneId(page),{timeout:30000}).toBe(testPane);
   // Readback must use fullscreen: adjacent panes share xterm's text rows.
   await keys(page,'Control+g','p','f');
   await expect.poll(()=>fullscreen(page),{timeout:30000}).toBe(true);
   assert.equal(await paneId(page),testPane);
   await keys(page,'Control+g','p','f');await expect.poll(()=>fullscreen(page),{timeout:30000}).toBe(false);
   // Close only the new split, using the course's pane controls.
   await keys(page,'Alt+l');await expect.poll(()=>paneId(page),{timeout:30000}).toBe(splitPane);
   await keys(page,'Control+g','p','f');await expect.poll(()=>fullscreen(page),{timeout:30000}).toBe(true);
   assert.equal(await paneId(page),splitPane);
   await keys(page,'Control+g','p','x');
   assert.equal(await paneId(page),testPane);
   assert.match(await t.command(page,'printf "VALUE=%s\\n" "$ZELLIJ_CHECK_VALUE"'),new RegExp('VALUE='+nonce));
   assert.deepEqual(await counts(page),[before[0]+1,before[1]+1]);
   await page.close();
   // No direct terminal client remains: hide/show and popout must preserve the session.
   const wrapper=await context.newPage();await wrapper.goto(base+'/labs/bitcoin/'+role+'/');
   const frame=()=>wrapper.frames().find(f=>f.url().includes('/node-'+node+'/'));
   await expect.poll(()=>!!frame()).toBe(true);await t.ready(frame());await selectTestPane(frame(),before[0]+1,testPane);
   assert.match(await t.command(frame(),'printf "VALUE=%s\\n" "$ZELLIJ_CHECK_VALUE"'),new RegExp('VALUE='+nonce));
   await wrapper.getByRole('button',{name:'Hide Console',exact:true}).click();
   await expect(wrapper.locator('#term')).toHaveAttribute('src','about:blank');
   await wrapper.getByRole('button',{name:'Show Console',exact:true}).click();
   await expect.poll(()=>!!frame()).toBe(true);await t.ready(frame());await selectTestPane(frame(),before[0]+1,testPane);
   assert.match(await t.command(frame(),'printf "VALUE=%s\\n" "$ZELLIJ_CHECK_VALUE"'),new RegExp('VALUE='+nonce));
   const popupPromise=context.waitForEvent('page');await wrapper.getByRole('button',{name:'Popout',exact:true}).click();
   const popup=await popupPromise;await t.ready(popup);await selectTestPane(popup,before[0]+1,testPane);
   assert.match(await t.command(popup,'printf "VALUE=%s\\n" "$ZELLIJ_CHECK_VALUE"'),new RegExp('VALUE='+nonce));
   await wrapper.getByRole('button',{name:'Show Console',exact:true}).click();
   await expect.poll(()=>!!frame()).toBe(true);await t.ready(frame());await selectTestPane(frame(),before[0]+1,testPane);
   // Closing our test tab must leave all pre-existing tabs and panes intact.
   await frame().locator('.xterm-helper-textarea').focus();await keys(frame(),'Control+g','t','x');
   assert.deepEqual(await counts(frame()),before);
   await t.command(frame(),`rm -f -- '${statePath}'`);
   await wrapper.screenshot({path:'/tmp/bitcoin-zellij-'+role+'.png'});
   await context.close();console.log('PASS Zellij '+role+': keyboard panes/tabs, reload, hide/show, popout, and cleanup');
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
