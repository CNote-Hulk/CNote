const { chromium, devices } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const iphone = devices['iPhone 13'];
    const context = await browser.newContext({ ...iphone });
    const page = await context.newPage();
    await page.setExtraHTTPHeaders({ 'x-forwarded-proto': 'https' });

    page.on('console', msg => console.log('[console]', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('[pageerror]', err.message));

    await page.goto('http://127.0.0.1:3000/html/pages/community.html#marketplace', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

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
