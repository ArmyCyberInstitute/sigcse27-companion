const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { expect } = require('@playwright/test');

module.exports = async function checkDocumentation(browser, base) {
  const root = path.resolve(__dirname, '..');
  const guides = ['README.md', 'THIRD_PARTY_LICENSES.md', 'licenses/sources/README.md'];
  for (const directory of ['docs', 'quizes', 'tests/playbooks']) {
    guides.push(...fs.readdirSync(path.join(root, directory)).filter(n => n.endsWith('.md')).map(n => directory + '/' + n));
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const downloads = [];
  page.on('download', d => downloads.push(d.suggestedFilename()));
  await page.goto(base + '/collection.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#quarto-header')).toHaveCSS('position', 'fixed');
  await expect(page.locator('#quarto-header .navbar')).toHaveCSS('display', 'flex');
  await page.setViewportSize({ width: 390, height: 844 });
  const navigation = page.locator('#quarto-header .navbar-toggler');
  await expect(navigation).toBeVisible();
  await expect(page.locator('#navbarCollapse')).toBeHidden();
  await navigation.click();
  await expect(page.locator('#navbarCollapse')).toBeVisible();
  await expect(page.locator('#navbarCollapse')).toHaveClass(/\bshow\b/);
  await navigation.click();
  await expect(page.locator('#navbarCollapse')).toBeHidden();
  await page.setViewportSize({ width: 1280, height: 900 });
  assert.equal(await page.locator('main a[href$=".md"]').count(), 0, 'The collection opens rendered guides');
  await page.getByRole('link', { name: 'Lesson and activity evolution', exact: true }).click();
  await page.waitForURL('**/docs/EVOLUTION.html');
  assert.match(await page.locator('main').innerText(), /01-CM-consensus_in_distributed_systems_and_blockchains_intro/);
  for (const source of guides) {
    const route = '/' + source.replace(/\.md$/, '.html');
    const response = await page.goto(base + route, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200, route);
    assert.match(response.headers()['content-type'], /text\/html/, route);
    assert.equal(await page.locator('main h1').count(), 1, 'One page title: ' + route);
    await expect(page.locator('#quarto-header .navbar')).toHaveCSS('display', 'flex');
    const sourceLink = page.getByRole('link', { name: 'Markdown source', exact: true });
    const rawURL = new URL(await sourceLink.getAttribute('href'), page.url());
    assert.equal(rawURL.pathname, '/source/' + source);
    const raw = await page.request.get(rawURL.href);
    assert.equal(raw.status(), 200, source);
    assert.equal(await raw.text(), fs.readFileSync(path.join(root, source), 'utf8'), 'Markdown matches its repository file');
    if (!process.env.UI_ONLY) {
      const legacy = await page.request.get(base + '/' + source + '?view=guide');
      assert.equal(new URL(legacy.url()).pathname, route, 'Legacy Markdown URL opens its rendered guide');
      assert.equal(new URL(legacy.url()).search, '?view=guide');
      assert.match(legacy.headers()['content-type'], /text\/html/);
      assert.match(raw.headers()['content-type'], /text\/plain/);
    }
    assert.equal(await page.locator('main a[href$=".md"]:not(.markdown-source a)').count(), 0, 'Guide cross-links use rendered pages: ' + route);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Guide fits mobile: ' + route);
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'web/catalog.json'), 'utf8'));
  const lessons = new Map();
  for (const thread of catalog.threads) for (const versions of Object.values(thread.lessons)) {
    for (const lesson of versions) if (lesson.source.endsWith('.qmd')) lessons.set(lesson.source, lesson.url);
  }
  const activities = new Set();
  const externalTargets=JSON.parse(fs.readFileSync(path.join(root,'web/external-link-targets.json'),'utf8'));
  let repairedExternalLinks=0;
  for (const [source, route] of lessons) {
    const response = await page.request.get(base + '/' + route);
    assert.equal(response.status(), 200, route);
    const sourceText=fs.readFileSync(path.join(root,source),'utf8').replace(/<!--[\s\S]*?-->/g,'');
    const rendered=await response.text();
    for(const [old,target] of Object.entries(externalTargets)){
      if(sourceText.includes(old)){assert.ok(rendered.includes('href="'+target+'"'),'Verified external target: '+target);assert.ok(!rendered.includes('href="'+old+'"'),'Retired external target: '+old);repairedExternalLinks++;}
    }
    const links = await page.evaluate(html => [...new DOMParser().parseFromString(html, 'text/html').querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(href => href.includes('/assets/labs/')), rendered);
    for (const href of links) {
      const target = new URL(href, base + '/' + route);
      assert.equal(target.origin, new URL(base).origin, 'Microlab stays on this host and port');
      assert.ok(target.pathname.startsWith('/snapshots/' + source.split('/')[1] + '/assets/labs/'), 'Microlab keeps its lesson snapshot');
      assert.ok(target.pathname.endsWith('.html'), 'Microlab points to a page');
      activities.add(target.href);
    }
  }
  assert.ok(activities.size > 0);
  assert.ok(repairedExternalLinks>=2,'Historical-source links open verified primary copies');
  for (const url of activities) {
    const response = await page.request.get(url);
    assert.equal(response.status(), 200, url);
    assert.match(response.headers()['content-type'], /text\/html/, url);
  }
  // Follow a real activity link from a rendered lesson, including Reveal navigation.
  const hashing = catalog.threads.find(t => t.id === 'hashing').lessons.final[0];
  await page.goto(base + '/' + hashing.url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Reveal?.isReady());
  await page.evaluate(() => {
    const link = document.querySelector('a[href$="/assets/labs/merkle-trees/index.html"]');
    const { h, v } = Reveal.getIndices(link.closest('section'));
    Reveal.slide(h, v);
  });
  await page.locator('a[href$="/assets/labs/merkle-trees/index.html"]').click();
  await page.waitForURL('**/snapshots/final/assets/labs/merkle-trees/index.html');
  assert.equal(new URL(page.url()).origin, new URL(base).origin);
  assert.match(await page.title(), /Merkle/);
  assert.deepEqual(downloads, [], 'Reading guides and opening microlabs triggers no downloads');
  console.log(`Documentation: ${guides.length} rendered guides, matching Markdown sources, mobile layout, and ${activities.size} local lesson activity targets passed`);
  await page.close();
};
