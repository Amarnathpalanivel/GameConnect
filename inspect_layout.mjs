import puppeteer from 'puppeteer';

async function check() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1350, height: 693 });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });

  // Fill login
  await page.type('input[type="email"]', 'valkyrie@gameconnect.gg');
  await page.type('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2500));

  // Click on a user contact in sidebar
  const contacts = await page.$$('.glass-card > div:first-child div[class*="cursor-pointer"]');
  if (contacts.length > 2) {
    await contacts[2].click();
    await new Promise(r => setTimeout(r, 1000));
  }

  const data = await page.evaluate(() => {
    const card = document.querySelector('.glass-card');
    const right = document.querySelector('.glass-card > div:last-child');
    const sidebar = document.querySelector('.glass-card > div:first-child');
    const body = document.body;
    const html = document.documentElement;

    return {
      window: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollY: window.scrollY,
        documentHeight: html.scrollHeight
      },
      cardRect: card ? {
        top: card.getBoundingClientRect().top,
        bottom: card.getBoundingClientRect().bottom,
        height: card.getBoundingClientRect().height,
      } : null,
      sidebarRect: sidebar ? {
        top: sidebar.getBoundingClientRect().top,
        height: sidebar.getBoundingClientRect().height,
      } : null,
      rightRect: right ? {
        top: right.getBoundingClientRect().top,
        height: right.getBoundingClientRect().height,
        scrollHeight: right.scrollHeight,
        clientHeight: right.clientHeight
      } : null,
    };
  });

  console.log('LAYOUT_DATA:', JSON.stringify(data, null, 2));
  await browser.close();
}

check().catch(e => console.error(e));
