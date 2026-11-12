/** Browser terminal helpers: inspect xterm's rendered buffer, including Zellij. */
const assert=require('node:assert/strict');
const {expect}=require('@playwright/test');
async function text(page){
 return page.evaluate(()=>{
  const buffer=window.term?.buffer.active;
  if(!buffer)return '';
  return Array.from({length:buffer.length},(_,i)=>buffer.getLine(i)?.translateToString(true)||'').join('\n');
 });
}
async function renderVersion(page){
 return page.evaluate(()=>{
  if(!window.__terminalRenderCounter){
   window.__terminalRenderCounter={value:0};
   window.term.onWriteParsed(()=>window.__terminalRenderCounter.value++);
  }
  return window.__terminalRenderCounter.value;
 });
}
async function ready(target){
 await target.locator('.xterm-screen').waitFor({timeout:30000});
 // The compact bar can hide the session title. Wait for the shell prompt at
 // the cursor, then read the session and pane from a real command response.
 await target.waitForFunction(()=>{
  const buffer=window.term?.buffer.active;
  if(!buffer)return false;
  const line=buffer.getLine(buffer.baseY+buffer.cursorY);
  const prompt=line?.translateToString(false,0,buffer.cursorX).trimEnd()||'';
  return /[$#]$/.test(prompt);
 },undefined,{timeout:30000});
 const output=await command(target,'printf "SESSION=%s PANE=%s\\n" "$ZELLIJ_SESSION_NAME" "$ZELLIJ_PANE_ID"');
 assert.match(output.trim(),/^SESSION=bitcoin PANE=\d+$/,'The terminal must accept commands in the bitcoin Zellij session');
}
async function connect(context,base,node){
 const page=await context.newPage();
 await page.goto(base+'/labs/bitcoin/node-'+node+'/',{waitUntil:'domcontentloaded'});
 await ready(page);
 return page;
}
function outputBetween(value,start,end){
 const rows=value.split('\n');const from=rows.findIndex(row=>row.includes(start));
 const to=rows.findLastIndex(row=>row.includes(end));
 assert.ok(from>=0&&to>from,'Terminal output markers must frame the result');
 const left=rows[from].indexOf(start);
 const border=rows[from].slice(left+start.length).search(/[│┃]/);
 const right=border<0?undefined:left+start.length+border;
 return rows.slice(from+1,to).map(row=>row.slice(left,right).trim()).join('\n');
}
async function command(page,value){
 const token='T'+Date.now().toString(36)+'_'+Math.random().toString(16).slice(2,10);
 const start=token+'_BEGIN',end=token+'_END';
 await page.locator('.xterm-helper-textarea').focus();
 const keyboard=page.keyboard||page.page().keyboard;
 // Split marker literals in the typed command: command echo must never count
 // as the shell's output. Crop readback to the emitting pane's text columns.
 await keyboard.insertText(`printf '\\n%s%s\\n' '${token}' '_BEGIN'; ${value}; printf '\\n%s%s\\n' '${token}' '_END'`);
 await keyboard.press('Enter');
 await expect.poll(async()=>(await text(page)).includes(end),{timeout:60000}).toBe(true);
 return outputBetween(await text(page),start,end);
}
async function terminal(parent,base,node,value){
 const page=await connect(parent.context(),base,node);
 try{return await command(page,value);}finally{await page.close();}
}
module.exports={text,ready,connect,command,terminal,renderVersion,outputBetween};
