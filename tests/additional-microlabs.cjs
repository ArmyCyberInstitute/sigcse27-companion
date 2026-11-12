/** Standalone comparisons and local-only teaching workflows. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium, expect} = require('@playwright/test');
require('./offline-network.cjs').install(chromium);

async function checkAdditionalMicrolabs(browser, base) {
  const activities = require('../web/catalog.json').additional_microlabs;
  const page = await browser.newPage({viewport: {width: 1512, height: 1100}});
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const activity of activities) {
    await page.goto(base + '/collection.html');
    await page.getByRole('link', {name: activity.title, exact: true}).click();
    await expect(page.locator('.preview-card')).toHaveCount(2);
    assert.equal(new URL(page.url()).searchParams.get('microlab'), activity.id);
    await page.goto(base);
    await expect(page.getByRole('heading', {name: 'Highlighted microlabs', exact: true})).toBeVisible();
    await expect(page.locator('#microlab-gallery a')).toHaveCount(3);
    assert.equal(await page.locator('.preview-card').count(), 0);
    await page.locator('#microlab-gallery').getByRole('link', {name: activity.title, exact: true}).click();
    await expect(page.locator('.preview-card')).toHaveCount(2);
    assert.equal(new URL(page.url()).searchParams.get('microlab'), activity.id);
    assert.deepEqual(await page.locator('.preview-card').evaluateAll(cards => cards.map(card => card.dataset.stage)), ['pilot', 'final']);
    await expect(page.locator('#kinds')).toBeHidden();
    for (const stage of ['pilot', 'final']) {
      const card = page.locator(`.preview-card[data-stage="${stage}"]`);
      await card.frameLocator('iframe').locator('body').waitFor();
      await card.getByRole('button', {name: 'Source', exact: true}).click();
      const source = activity.versions[stage][0].source;
      await expect(card.locator('pre')).toHaveText(fs.readFileSync(path.join(__dirname, '..', source), 'utf8'));
      await card.getByRole('button', {name: 'Preview', exact: true}).click();
    }
    await page.locator('#reader-options > summary').click();
    await expect(page.locator('#timeline .stage')).toHaveCount(2);
    await expect(page.locator('#timeline')).toContainText('Also before group review');
    await page.locator('#reader-options > summary').click();
    await page.getByRole('button', {name: 'Single', exact: true}).click();
    await page.reload();
    await expect(page.locator('.preview-card')).toHaveCount(1);
    assert.equal(await page.locator('.preview-card').getAttribute('data-stage'), 'final');
    await page.getByRole('button', {name: 'All versions', exact: true}).click();
    await expect(page.locator('.preview-card')).toHaveCount(2);
    await page.locator('#thread-switch').selectOption('hashing');
    await expect(page.getByRole('tab', {name: 'Lessons', exact: true})).toHaveAttribute('aria-selected', 'true');
  }

  for (const stage of ['pilot', 'final']) {
    // Freeze simulation timers during manual input; no random outcome is required.
    const mining = await browser.newPage();
    mining.setDefaultTimeout(30000);
    mining.on('pageerror', error => errors.push(error.message));
    const now = Date.now();
    await mining.clock.install({time: new Date(now)});
    await mining.clock.pauseAt(new Date(now + 100));
    await mining.goto(`${base}/snapshots/${stage}/assets/labs/POW_mining_micro/index.html`);
    await mining.locator('#startBtn').click();
    await expect(mining.locator('#mineBtn')).toBeEnabled();
    await mining.locator('#mineBtn').click();
    await expect(mining.locator('#userAttempts')).toContainText('1 attempt');
    if (stage === 'final') {
      await mining.locator('#tab2').click();
      await mining.locator('#l2DiffInput').press('Home');
      await mining.locator('#l2NodeInput').press('End');
      await mining.locator('#l2RateInput').press('End');
      await mining.locator('#l2StartBtn').click();
      await mining.clock.runFor(20000);
      await expect.poll(() => mining.locator('#blockLog .log-row').count()).toBeGreaterThanOrEqual(4);
      await expect(mining.locator('#blockLog .adj-event').first()).toBeAttached();
      await mining.locator('#l2StopBtn').click();
    }
    await mining.close();

    const diagnostics = stage === 'final' ? '?debug' : '';
    await page.goto(`${base}/snapshots/${stage}/assets/labs/ether-smart-contract-micro/index.html${diagnostics}`);
    await page.locator('#runTests').click();
    await expect.poll(() => page.locator('#testResults .test-pass').count()).toBeGreaterThanOrEqual(3);
    assert.equal(await page.locator('#testResults .test-fail').count(), 0, `${stage} contract self-tests`);
    if (stage === 'final') {
      await page.locator('#scenarioAttack').click();
      await page.locator('#debugTabBtn').click();
      const before = await page.locator('#debugNarration').innerText();
      await page.locator('#stepAttackDebug').click();
      await expect(page.locator('#debugNarration')).not.toHaveText(before);
    }

    await page.goto(`${base}/snapshots/${stage}/assets/labs/ether_mev/mev_builders.html`);
    await page.locator('#btnLocalFillTips').click();
    await expect(page.locator('#localGasUsed')).not.toHaveText('0');
    await page.locator('#bidsList .bidCard').first().click();
    await expect(page.locator('#btnReveal')).toBeEnabled();
    await page.locator('#btnReveal').click();
    await expect(page.locator('#m_slots')).toHaveText('1');
    await page.locator('#btnCloseModal').click();
    await page.locator('#btnNewSlot').click();
    await expect(page.locator('#slotNum')).toHaveText('2');
  }
  await page.setViewportSize({width: 390, height: 844});
  await page.goto(base);
  await expect(page.locator('#microlab-gallery a')).toHaveCount(3);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('#microlab-gallery a').first().click();
  await expect(page.locator('.preview-card')).toHaveCount(2);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const readerSwitch = page.locator('#thread-switch');
  await readerSwitch.selectOption('microlab:mev');
  await expect(page.locator('#topic-title')).toHaveText('MEV, builders, and relays');
  assert.deepEqual(errors, [], 'Highlighted microlabs have no JavaScript errors');
  await page.close();
  console.log('Highlighted microlabs: gallery, comparisons, sources, shared links, mobile, PoW, contract execution, and MEV passed');
}

module.exports = checkAdditionalMicrolabs;
if (require.main === module) {
  (async () => {
    const browser = await chromium.launch();
    try { await checkAdditionalMicrolabs(browser, process.env.BASE_URL || 'http://127.0.0.1:8080'); }
    finally { await browser.close(); }
  })().catch(error => {console.error(error); process.exitCode = 1;});
}
