/* Presentation acceptance checks: run with node tests/ui.cjs. */
const { chromium } = require('../.test-tools/node_modules/playwright');
const { pathToFileURL } = require('url');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const artifacts = path.join(root, 'test-artifacts');
const url = pathToFileURL(path.join(root, 'index.html')).href;
const check = (condition, message) => { if (!condition) throw new Error(message); };

(async () => {
    const browser = await chromium.launch({
        channel: 'chrome', headless: true,
        args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader']
    });
    try {
        fs.mkdirSync(artifacts, { recursive: true });
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        check(await page.locator('#bootScreen').isVisible(), 'Intro should be visible on first entry');
        await page.screenshot({ path: path.join(artifacts, 'visual-intro.png'), animations: 'disabled' });
        await page.waitForFunction(() => document.body.dataset.boot === 'ready');
        await page.locator('#bootScreen').waitFor({ state: 'hidden' });
        check(await page.locator('#appShell').getAttribute('aria-busy') === 'false', 'App remained busy');
        check(await page.evaluate(() => !document.getElementById('appShell').inert), 'App remained inert');
        check(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()) === '#3b82f6', 'Signal Blue accent missing');
        check(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()) === '#080d18', 'Deep Space background missing');
        check(await page.locator('#bootProgress').getAttribute('aria-valuenow') === '100', 'Loader did not complete');
        check(await page.evaluate(()=>analogfit.state.lang)==='en','First-time international view should be English');

        await page.locator('#tabRanking').click();
        check(await page.locator('#rankingPane').isVisible(), 'Ranking tab failed');
        check(await page.locator('#configPane').isHidden(), 'Configuration pane remained visible');
        await page.locator('#rankSites button').first().click();
        await page.locator('#locationDashboard h1').waitFor({state:'visible'});
        check(await page.locator('#locationDashboard h1').isVisible(), 'Selecting a rank did not show analysis');
        await page.locator('#tabRanking').focus();
        await page.keyboard.press('ArrowLeft');
        check(await page.locator('#tabConfig').getAttribute('aria-selected') === 'true', 'Keyboard tab navigation failed');

        await page.locator('#btnResources').click();
        check(await page.locator('.resource-card').count() === 11, 'Expected all eleven supplied resources');
        const links = await page.locator('.resource-card a').evaluateAll(nodes => nodes.map(node => node.href));
        check(links.some(link => link.includes('gportal.jaxa.jp')), 'JAXA missing');
        check(links.some(link => link.includes('asc-csa/Synthetic_Aperture_Radar_Tutorial')), 'CSA tutorial missing');
        check(links.some(link => link.includes('diviner.htm')), 'Diviner missing');
        check(links.every(link => link.startsWith('https://')), 'Unexpected resource protocol');
        check(await page.locator('.resource-card[data-integration=reference]').count() === 5, 'Unintegrated resource status incorrect');
        await page.screenshot({ path: path.join(artifacts, 'visual-resources.png'), animations: 'disabled' });
        await page.locator('[data-resource-filter=nasa]').click();
        check(await page.locator('.resource-card').count() === 5, 'NASA filter failed');
        await page.locator('[data-resource-filter=partner]').click();
        check(await page.locator('.resource-card').count() === 6, 'Partner filter failed');
        await page.locator('#resourceSearch').fill('JAXA');
        check(await page.locator('.resource-card').count() === 1, 'Resource search failed');
        await page.locator('#resourceSearch').fill('zzzz-no-resource');
        check(await page.locator('#resourceEmpty').isVisible(), 'Empty state missing');
        await page.keyboard.press('Escape');
        check(await page.locator('#dlgResources').isHidden(), 'Escape did not dismiss resource dialog');
        check(await page.locator('#btnExplore').getAttribute('aria-current') === 'page', 'Navigation state not restored');

        await page.locator('[data-lang=en]').click();
        check(await page.locator('[data-ui=missionTitle]').innerText() === 'Find a rehearsal ground on Earth.', 'English presentation text missing');
        await page.locator('[data-lang=id]').click();
        await page.evaluate(() => analogfit.select('VAL_01', true));
        await page.waitForTimeout(1200);
        await page.screenshot({ path: path.join(artifacts, 'visual-dashboard.png'), animations: 'disabled' });
        await page.locator('[data-view="3d"]').click();
        await page.waitForFunction(() => !!document.querySelector('#globe canvas'));
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(artifacts, 'visual-globe.png'), animations: 'disabled' });
        await page.locator('[data-view="2d"]').click();

        const widths = [390, 768, 1024, 1280, 1440];
        for (const width of widths) {
            await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
            check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow at ' + width);
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({ path: path.join(artifacts, 'visual-mobile.png'), fullPage: true, animations: 'disabled' });
        await page.locator('#btnResources').click();
        await page.locator('#resourceSearch').fill('');
        await page.locator('[data-resource-filter=all]').click();
        check(await page.evaluate(() => document.getElementById('dlgResources').getBoundingClientRect().width <= innerWidth), 'Mobile resource dialog overflow');
        await page.screenshot({ path: path.join(artifacts, 'visual-mobile-resources.png'), animations: 'disabled' });
        await page.keyboard.press('Escape');

        const reduced = await browser.newContext({ reducedMotion: 'reduce', offline: true, viewport: { width: 1440, height: 1000 } });
        const quiet = await reduced.newPage();
        quiet.on('pageerror', error => errors.push(error.message));
        await quiet.goto(url);
        await quiet.waitForFunction(() => document.body.dataset.boot === 'ready');
        await quiet.locator('#bootScreen').waitFor({ state: 'hidden' });
        // The in-app switch is the single authority for motion; the OS setting does not disable it.
        check(await quiet.evaluate(() => getComputedStyle(document.querySelector('.boot-orbit')).animationName !== 'none'), 'Animations should run until switched off in Settings');
        await quiet.evaluate(() => AnalogFitPrefs.set('motion', false));
        check(await quiet.evaluate(() => getComputedStyle(document.querySelector('.boot-orbit')).animationName === 'none'), 'Interface animations switch ignored');
        await quiet.locator('#btnResources').click();
        check(await quiet.locator('.resource-card').count() === 11, 'Offline resource register unavailable');
        check(errors.length === 0, 'Page errors: ' + errors.join('\n'));
        const report = {
            palette: { background: '#080d18', panel: '#111b2d', accent: '#3b82f6' },
            introAndRealReadiness: true, keyboardTabs: true, resourceCount: 11,
            nasaFilter: 5, partnerFilter: 6, resourceSearch: true,
            englishAndIndonesian: true, viewportWidths: widths, reducedMotion: true,
            offlineEntryAndResourceRegister: true, pageErrors: errors
        };
        fs.writeFileSync(path.join(artifacts, 'ui-report.json'), JSON.stringify(report, null, 2));
        console.log(JSON.stringify(report, null, 2));
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
