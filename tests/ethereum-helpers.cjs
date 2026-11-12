const {expect}=require('@playwright/test');
async function newWallet(page,label='Regression wallet'){
 page.once('dialog',dialog=>dialog.accept(label+' '+Date.now()));
 await page.getByRole('button',{name:/🔑 New/}).click();
 const dialog=page.getByRole('heading',{name:/New Wallet Created/}).locator('..');
 const address=await dialog.locator('input[readonly]').first().inputValue();
 await page.getByRole('button',{name:/Got it.*saved my credentials/}).click();
 return address;
}
async function topOff(page){
 await page.getByRole('button',{name:/Top off/}).click();
 const challenge=page.frameLocator('iframe[title="Proof-of-work top-off mining challenge"]');
 for(let round=0;round<20;round++){
  await challenge.locator('#startBtn:visible,#resetBtn:visible').click();
  await expect(challenge.locator('#mineBtn')).toBeDisabled();
  // Ready period is intentional; neither the player nor the robots may mine yet.
  // Observe the actual transition: a fixed delay can let a robot win before
  // the first player input, especially on a loaded CI host.
  await expect.poll(async()=>await challenge.locator('#mineBtn').isEnabled()||await challenge.locator('#resetBtn').isVisible(),{timeout:10000,intervals:[10]}).toBe(true);
  for(let batch=0;batch<20;batch++){
   if(!(await page.locator('iframe[title="Proof-of-work top-off mining challenge"]').count()))break;
   const status=await challenge.locator('#status').innerText();
   if(status.includes('You win')||await challenge.locator('#resetBtn').isVisible())break;
   // Keep focus in the challenge and use its ordinary keyboard control.
   // Check the result between short batches instead of adding a delay per key.
   for(let click=0;click<8;click++)await page.keyboard.press('m');
  }
  if(!(await page.locator('iframe[title="Proof-of-work top-off mining challenge"]').count()))break;
  if((await challenge.locator('#status').innerText()).includes('You win'))break;
 }
 await expect(page.locator('iframe[title="Proof-of-work top-off mining challenge"]')).toHaveCount(0,{timeout:40000});
}
module.exports={newWallet,topOff};
