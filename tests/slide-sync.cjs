const assert = require('node:assert/strict');
const {expect} = require('@playwright/test');
module.exports = async function checkSlideSync(browser, base, catalog) {
  const page=await browser.newPage({viewport:{width:1512,height:1100}});
  const errors=[];page.on('pageerror',e=>{if(/\/web\/(explorer|slide-sync)\.js/.test(e.stack||''))errors.push(e.message);});
  const stages=['early-work','pilot','pre-group-review','final'];
  async function frame(stage) {
    const locator=page.locator('.preview-card[data-stage="'+stage+'"] iframe');
    let f;
    await expect.poll(async()=>{
      try {
        const handle=await locator.elementHandle();f=handle&&await handle.contentFrame();
        return !!f&&await f.evaluate(()=>!!window.Reveal?.isReady())&&await page.locator('.preview-card[data-stage="'+stage+'"] .section-select option').count()>0;
      } catch {return false;}
    },{timeout:20000,message:stage+' slide preview is ready'}).toBe(true);
    return f;
  }
  async function current(stage) {
    try{return await (await frame(stage)).evaluate(()=>({id:Reveal.getCurrentSlide().id,keys:(Reveal.getCurrentSlide().closest('section[data-sync-id]')?.dataset.syncId||'').split(/\s+/)}));}catch{return {id:'loading',keys:[]};}
  }
  async function go(stage,key) {
    const f=await frame(stage);await f.evaluate(key=>{
      const nodes=[...document.querySelectorAll('.slides section[data-sync-id]')];
      const node=nodes.find(n=>n.dataset.syncId===key)||nodes.find(n=>n.dataset.syncId.split(/\s+/).includes(key));
      if(!node)throw Error('Slide not found: '+key);
      const {h,v}=Reveal.getIndices(node);Reveal.slide(h,v);
    },key);
  }
  async function matched(stage,key) {
    await expect.poll(async()=>(await current(stage)).keys.includes(key),{timeout:15000,message:stage+' follows '+key}).toBe(true);
  }
  async function start(thread) {
    await page.goto(base+'/?thread='+thread+'&kind=lessons&stages='+stages.join(','),{waitUntil:'domcontentloaded'});
    for(const stage of stages)await frame(stage);
  }
  // Every final reference ID is exercised against all available prior snapshots.
  // This catches missing rendered attributes, reordered content, and stale frame listeners.
  let anchors=0,held=0;
  for(const thread of catalog.threads) {
    await start(thread.id);
    for(const artifact of thread.lessons.final) {
      if(thread.lessons.final.length>1) {
        const details=page.locator('.preview-card[data-stage="final"] .card-options');
        await details.evaluate(n=>n.open=true);
        await details.locator('.artifact-select').selectOption(artifact.id);
        await expect.poll(async()=>await page.locator('.preview-card[data-stage="final"] .artifact-select').inputValue()).toBe(artifact.id);
        for(const stage of stages)await frame(stage);
      }
      for(const key of artifact.sync_keys) {
        const previous=await Promise.all(stages.slice(0,3).map(current));
        await go('final',key);await matched('final',key);
        for(let i=0;i<3;i++) {
          const stage=stages[i];
          const exists=thread.lessons[stage].some(a=>a.format==='Quarto'&&a.sync_keys.includes(key));
          if(exists)await matched(stage,key);
          else {
            await expect(page.locator('.preview-card[data-stage="'+stage+'"] .sync-badge')).toHaveText('No matching slide');
            assert.equal((await current(stage)).id,previous[i].id,stage+' holds position when '+key+' has no counterpart');held++;
          }
        }
        anchors++;
      }
    }
    console.log('Slide sync reference sweep:',thread.id);
  }
  await start('hashing');
  await go('final','hashing-preimage');await matched('early-work','hashing-preimage');
  const broad=(await current('early-work')).id;
  await go('final','hashing-second-preimage');await matched('early-work','hashing-second-preimage');
  assert.equal((await current('early-work')).id,broad,'Split final slides retain their broad early counterpart');
  await page.waitForTimeout(300);await matched('final','hashing-second-preimage');
  await go('final','hashing-merkle-proof');await matched('pilot','hashing-merkle-proof');
  await expect(page.locator('.preview-card[data-stage="early-work"] .sync-badge')).toHaveText('No matching slide');
  // A specific comparison topic switches to the early lesson that actually teaches it.
  await start('signatures');await go('final','signatures-symmetric-asymmetric');await matched('early-work','signatures-symmetric-asymmetric');
  assert.match(await page.locator('.preview-card[data-stage="early-work"] .card-title').textContent(),/Symmetric Cryptography/,'Related early lesson opens to follow the topic');
  await start('hashing');
  // Section selection and keyboard navigation both drive the other previews.
  const pilot=await frame('pilot');const salt=await pilot.evaluate(()=>[...document.querySelectorAll('section[data-sync-id]')].find(n=>n.dataset.syncId==='hashing-salting').id);
  await page.locator('.preview-card[data-stage="pilot"] .card-options').evaluate(n=>n.open=true);
  await page.locator('.preview-card[data-stage="pilot"] .section-select').selectOption(salt);await matched('final','hashing-salting');
  await page.locator('details[open]').evaluateAll(ns=>ns.forEach(n=>n.open=false));
  await go('final','hashing-definition');
  const final=await frame('final');await final.locator('.reveal').click({position:{x:100,y:90}});await final.locator('body').press('ArrowRight');await matched('pilot','hashing-properties');
  // Turning sync off leaves all frames mounted, at independent positions.
  await page.locator('#reader-options > summary').click();await page.locator('#slide-sync').click();
  await expect(page.locator('#slide-sync')).toHaveAttribute('aria-pressed','false');
  await page.locator('#reader-options').evaluate(n=>n.open=false);
  const before=(await current('pilot')).id;
  await go('final','hashing-commitment');await page.waitForTimeout(250);
  assert.equal((await current('pilot')).id,before,'Sync off leaves the other pane in place');
  assert.equal(new URL(page.url()).searchParams.get('sync'),'0');
  await page.locator('#reader-options > summary').click();await page.locator('#slide-sync').click();
  await matched('pilot','hashing-commitment');await page.locator('#reader-options').evaluate(n=>n.open=false);
  // A source pane must not be replaced or moved by another lesson's navigation.
  await page.locator('.preview-card[data-stage="pilot"]').getByRole('button',{name:'Source',exact:true}).click();
  await page.locator('.preview-card[data-stage="pilot"] pre').waitFor();
  await go('final','hashing-salting');
  assert.equal(await page.locator('.preview-card[data-stage="pilot"] pre').isVisible(),true);
  await page.locator('.preview-card[data-stage="pilot"]').getByRole('button',{name:'Preview',exact:true}).click();await matched('pilot','hashing-salting');
  // Shared links restore the mapped slide; one-pane mode retains it too.
  const shared=page.url();await page.reload({waitUntil:'domcontentloaded'});await matched('final','hashing-salting');await matched('pre-group-review','hashing-salting');
  assert.equal(new URL(shared).searchParams.get('slide'),'hashing-salting');
  await page.getByRole('button',{name:'Single',exact:true}).click();await matched('final','hashing-salting');
  await page.getByRole('button',{name:'All versions',exact:true}).click();await matched('pilot','hashing-salting');
  await page.setViewportSize({width:390,height:844});
  await page.locator('#reader-options > summary').click();await expect(page.locator('#slide-sync')).toBeVisible();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.ok((await page.locator('#slide-sync').boundingBox()).height>=44,'Sync toggle has a mobile-sized touch target');
  await page.screenshot({path:'/tmp/slide-sync-mobile.png',fullPage:true});
  // With sync disabled the preference survives reload, and source comparisons do not sync.
  await page.locator('#slide-sync').click();await page.reload({waitUntil:'domcontentloaded'});await page.locator('#reader-options > summary').click();
  await expect(page.locator('#slide-sync')).toHaveAttribute('aria-pressed','false');
  await page.getByRole('button',{name:'Beamer / Quarto sources',exact:true}).click();
  await page.locator('#reader-options > summary').click();await expect(page.locator('#slide-sync')).toBeDisabled();
  await page.getByRole('tab',{name:/Microlabs/}).click();await expect(page.locator('#slide-sync')).toBeHidden();
  assert.deepEqual(errors,[]);
  console.log(`Slide sync: ${anchors} final anchors, ${held} unmatched holds, bidirectional navigation, split material, related lessons, toggle, source views, shared links, and mobile passed`);
  await page.close();
};
