/** Exercise local teaching activities and equation rendering in the browser. */
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { expect } = require('@playwright/test');

module.exports = async function checkMicrolabs(browser, base) {
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const stage of ['pilot', 'final']) {
    await page.goto(`${base}/snapshots/${stage}/assets/labs/micro-hashing/index.html`);
    await page.locator('#algo').selectOption('sha256');
    await page.locator('#inA').fill('offline demonstration');
    await expect(page.locator('#outA')).toHaveText(createHash('sha256').update('offline demonstration').digest('hex'));

    const signatures = stage === 'final' ? 'signatures/index.html' : 'asymmetric%20%26%20signature/asymmetric_signatures_lab.html';
    await page.goto(`${base}/snapshots/${stage}/assets/labs/${signatures}`);
    assert.notEqual(await page.locator('#btnGenKeyPair').evaluate(button => getComputedStyle(button).backgroundColor),
      'rgba(0, 0, 0, 0)', 'Signature activity styles load locally');
    const algorithms = await page.locator('#sigAlg option').evaluateAll(options => options.map(option => option.value));
    for (const algorithm of algorithms) {
      await page.locator('#sigAlg').selectOption(algorithm);
      const previousKey = await page.locator('#pubKeyHex').inputValue();
      await page.locator('#btnGenKeyPair').click();
      if (await page.locator('#btnToggleKeys').textContent() === 'Show') {
        await page.locator('#btnToggleKeys').click();
      }
      await expect(page.locator('#pubKeyHex')).not.toHaveValue('', {timeout: 30000});
      await expect(page.locator('#pubKeyHex')).not.toHaveValue(previousKey, {timeout: 30000});
      await page.locator('#message').fill('Offline signature test');
      await page.locator('#btnSign').click();
      await expect(page.locator('#signature')).not.toHaveValue('', {timeout: 30000});
      await page.locator('#btnVerify').click();
      await expect(page.locator('#verifyResult')).toHaveValue(/\bVALID\b/);
      await page.locator('#message').fill('Changed message');
      await page.locator('#btnVerify').click();
      await expect(page.locator('#verifyResult')).toHaveValue(/\bINVALID\b/);
    }
  }
  await page.goto(`${base}/snapshots/final/assets/labs/merkle-trees/index.html`);
  await page.locator('#content').fill('Offline Merkle tree verification. '.repeat(8));
  await page.locator('#generate').click();
  await expect(page.locator('#treeSummary')).toContainText('bytes per leaf');
  assert.ok(await page.locator('#tree input').count() > 0, 'Merkle hashes are populated');

  await page.goto(`${base}/snapshots/final/lessons/primitives/02-CP-hashing_and_merkle_trees.html`);
  await page.waitForFunction(() => window.Reveal?.isReady());
  await expect(page.locator('.MathJax').first()).toBeAttached({timeout: 30000});
  assert.deepEqual(errors, [], 'Microlabs and slide equations run without JavaScript errors');
  await page.close();
  console.log('Microlabs: SHA-256, signature generation/verification/tampering, Merkle trees, and slide equations passed');
};
