const { chromium, devices } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const iphone = devices['iPhone 13'];
    const context = await browser.newContext({ ...iphone });
    const page = await context.newPage();
    // Only spoof x-forwarded-proto for requests to our own local server (to dodge the
    // forced-HTTPS redirect) — NOT for cross-origin CDN requests (fonts/DOMPurify), where
    // this extra header breaks the CORS preflight and silently kills navbar injection.
    await context.route('**/*', (route) => {
        const url = new URL(route.request().url());
        if (url.hostname === '127.0.0.1') {
            const headers = { ...route.request().headers(), 'x-forwarded-proto': 'https' };
            return route.continue({ headers });
        }
        return route.continue();
    });

    page.on('console', msg => console.log('[console]', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('[pageerror]', err.message));
    page.on('response', async (res) => {
        if (res.url().includes('/api/')) {
            console.log('[api]', res.status(), res.url());
        }
    });

    const resp = await page.goto('http://127.0.0.1:3000/html/pages/community.html#marketplace', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('[nav]', resp.status(), page.url());
    await page.waitForTimeout(1500);
    console.log('[has hub-content]', await page.evaluate(() => !!document.querySelector('.hub-content')));
    console.log('[body len]', await page.evaluate(() => document.body.innerHTML.length));
    console.log('[body text]', await page.evaluate(() => document.body.innerText.slice(0, 500)));

    try {
        await page.waitForSelector('.hub-listing-card', { timeout: 8000 });
    } catch {
        console.log('[info] no .hub-listing-card appeared within 8s');
    }
    const marketHtml = await page.evaluate(() => {
        const el = document.getElementById('view-marketplace');
        return el ? el.innerHTML.slice(0, 1000) : 'NO #view-marketplace ELEMENT';
    });
    console.log('[market-html]', marketHtml);
    console.log('[current-view-active]', await page.evaluate(() => document.querySelector('.hub-view--active')?.id));

    // Click the first listing card if present
    const card = await page.$('.hub-listing-card');
    if (card) {
        await card.click();
        await page.waitForTimeout(1500);
    } else {
        console.log('[info] no .hub-listing-card found on marketplace view');
    }

    await page.screenshot({ path: '.pw-listing-mobile.png', fullPage: false });

    const info = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        const hub = document.querySelector('.community-page--hub');
        const content = document.querySelector('.hub-content');
        const view = document.querySelector('#view-listing');
        const scroll = document.querySelector('#view-listing .hub-detail-scroll');
        const navbar = document.querySelector('.navbar');
        const mbn = document.getElementById('mobile-bottom-nav');
        const g = el => el ? {
            scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
            offsetHeight: el.offsetHeight,
            overflowY: getComputedStyle(el).overflowY,
            height: getComputedStyle(el).height,
            position: getComputedStyle(el).position,
        } : null;
        return {
            bodyClass: body.className,
            viewportH: window.innerHeight,
            docScrollHeight: html.scrollHeight,
            bodyScrollHeight: body.scrollHeight,
            navbarClass: navbar ? navbar.className : null,
            mbnClass: mbn ? mbn.className : null,
            hub: g(hub), content: g(content), view: g(view), scroll: g(scroll),
        };
    });
    console.log(JSON.stringify(info, null, 2));

    // Simulate a scroll gesture on the window to see if navbar re-appears
    await page.mouse.move(195, 600);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => ({
        scrollY: window.scrollY,
        navbarClass: document.querySelector('.navbar')?.className,
        mbnClass: document.getElementById('mobile-bottom-nav')?.className,
    }));
    console.log('AFTER SCROLL:', JSON.stringify(after, null, 2));

    await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
