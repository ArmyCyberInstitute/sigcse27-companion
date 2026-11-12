/** Block browser requests outside the deployment origin during offline checks. */
const fs = require('node:fs');
const path = require('node:path');

function install(chromium) {
  if (process.env.OFFLINE_TEST !== '1' || chromium.__offlinePolicyInstalled) return;
  chromium.__offlinePolicyInstalled = true;
  const origin = new URL(process.env.BASE_URL || 'http://127.0.0.1:8080').origin;
  const launch = chromium.launch.bind(chromium);
  const blocked = new Set();
  chromium.launch = async (...args) => {
    const browser = await launch(...args);
    const newContext = browser.newContext.bind(browser);
    browser.newContext = async (options = {}) => {
      // Service workers can bypass Playwright's HTTP interception.
      const context = await newContext({...options, serviceWorkers: 'block'});
      await context.route('**/*', route => {
        const url = route.request().url();
        if (new URL(url).origin === origin) return route.continue();
        blocked.add(url);
        return route.abort('internetdisconnected');
      });
      await context.routeWebSocket(/.*/, socket => {
        if (new URL(socket.url()).host === new URL(origin).host) return socket.connectToServer();
        blocked.add(socket.url());
        socket.close({code: 1008, reason: 'Offline verification'});
      });
      return context;
    };
    return browser;
  };
  process.on('exit', () => {
    const directory = process.env.TEST_ARTIFACTS_DIR || '/tmp/companion-offline-evidence';
    fs.mkdirSync(directory, {recursive: true});
    const suite = path.basename(process.argv[1] || 'browser', '.cjs');
    fs.writeFileSync(path.join(directory, `blocked-external-requests-${suite}.json`),
      JSON.stringify([...blocked].sort(), null, 2) + '\n');
  });
}
module.exports = {install};
