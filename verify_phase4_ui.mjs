import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\0e5675fb-24ae-40c1-ac5b-8fc0ed39d714';

async function runVisualAudit() {
  console.log('🚀 Launching Puppeteer browser for Phase 4 Visual Verification...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    console.log('Navigating to http://localhost:5173/login ...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });

    // Login
    console.log('Logging in as amarnath1438686@gmail.com...');
    await page.type('input[type="email"]', 'amarnath1438686@gmail.com');
    await page.type('input[type="password"]', 'Password@123');
    await page.click('button[type="submit"]');

    await new Promise(r => setTimeout(r, 3000));

    console.log('Navigated to main page. Looking for Notification Center Bell...');
    // 1. Click Notification Bell
    const bellBtn = await page.$('button[title*="Notification"]');
    if (bellBtn) {
      await bellBtn.click();
      await new Promise(r => setTimeout(r, 1000));
      const notifShotPath = path.join(ARTIFACT_DIR, 'phase4_notifications_open.png');
      await page.screenshot({ path: notifShotPath });
      console.log('📸 Captured Notification Center screenshot to:', notifShotPath);

      // Close dropdown by clicking bell again
      await bellBtn.click();
      await new Promise(r => setTimeout(r, 500));
    } else {
      console.warn('⚠️ Could not find Notification button');
    }

    // 2. Click 📢 LFG Tab
    console.log('Clicking 📢 LFG tab...');
    const lfgTab = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('LFG'));
    });

    if (lfgTab) {
      await lfgTab.click();
      await new Promise(r => setTimeout(r, 1500));

      const lfgBoardShotPath = path.join(ARTIFACT_DIR, 'phase4_lfg_board.png');
      await page.screenshot({ path: lfgBoardShotPath });
      console.log('📸 Captured LFG Board screenshot to:', lfgBoardShotPath);

      // 3. Click ➕ Post LFG button
      console.log('Opening Create LFG modal...');
      const createPostBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => b.textContent.includes('Post LFG'));
      });

      if (createPostBtn) {
        await createPostBtn.click();
        await new Promise(r => setTimeout(r, 1000));

        const modalShotPath = path.join(ARTIFACT_DIR, 'phase4_create_modal.png');
        await page.screenshot({ path: modalShotPath });
        console.log('📸 Captured Create LFG Modal screenshot to:', modalShotPath);

        // Close modal (Cancel or ✕)
        const cancelBtn = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(b => b.textContent.includes('Cancel') || b.textContent.includes('✕'));
        });
        if (cancelBtn) {
          await cancelBtn.click();
          await new Promise(r => setTimeout(r, 600));
        }
      }

      // 4. Click 📅 Scheduled sub-tab
      console.log('Switching to 📅 Scheduled calendar sub-tab...');
      const scheduledSubTab = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => b.textContent.includes('Scheduled'));
      });

      if (scheduledSubTab) {
        await scheduledSubTab.click();
        await new Promise(r => setTimeout(r, 1500));

        const schedShotPath = path.join(ARTIFACT_DIR, 'phase4_scheduled_calendar.png');
        await page.screenshot({ path: schedShotPath });
        console.log('📸 Captured Scheduled Calendar screenshot to:', schedShotPath);
      }
    } else {
      console.warn('⚠️ Could not find LFG Tab button');
    }

    console.log('✅ Visual audit complete!');
  } catch (err) {
    console.error('Error during visual audit:', err);
  } finally {
    await browser.close();
  }
}

runVisualAudit();
