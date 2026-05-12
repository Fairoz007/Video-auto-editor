const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const outputDir = 'OUTPUTY';
// Find all mp4 files in the OUTPUTY directory
const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.mp4')).map(f => path.join(outputDir, f));

if (files.length === 0) {
    console.log(`No .mp4 files found in ${outputDir}`);
    process.exit(0);
}

// Load titles and descriptions
const readLines = (filePath) => {
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, 'utf8').split('\n').map(l => l.trim()).filter(l => l.length > 0);
};

const titles = readLines('titles.txt');
const descriptions = fs.existsSync('descriptions.txt') ? fs.readFileSync('descriptions.txt', 'utf8').split('===').map(l => l.trim()).filter(l => l.length > 0) : [];

if (titles.length === 0 || descriptions.length === 0) {
    console.error('titles.txt or descriptions.txt is empty.');
    process.exit(1);
}

const usedLogPath = 'used.log';
let usedLogs = [];
if (fs.existsSync(usedLogPath)) {
    usedLogs = readLines(usedLogPath);
}

// Calculate base date: tomorrow at 1:00 AM
let baseScheduleDate = new Date();
baseScheduleDate.setDate(baseScheduleDate.getDate() + 1);
baseScheduleDate.setHours(12, 15, 0, 0);

(async () => {
    const userDataDir = path.join(__dirname, 'user-data');
    console.log(`Found ${files.length} videos in ${outputDir}. Launching browser to upload them concurrently in multiple tabs...`);
    console.log(`(Opening tabs will be staggered by 5 seconds to prevent browser crashing from heavy load)`);

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false, 
        channel: 'chrome', 
        ignoreDefaultArgs: ['--enable-automation'], 
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    const uploadVideo = async (videoPath, index) => {
        // Stagger tab openings by 5 seconds to reduce CPU spike and prevent crashing
        await new Promise(r => setTimeout(r, index * 5000));
        
        const page = await context.newPage();
        page.setDefaultTimeout(120000); // Increased timeout to 2 minutes per action to be safe
        
        let availableTitles = titles.filter(t => !usedLogs.includes(`TITLE: ${t}`));
        if (availableTitles.length === 0) availableTitles = titles;
        const selectedTitle = availableTitles[Math.floor(Math.random() * availableTitles.length)];

        let availableDescriptions = descriptions.filter(d => !usedLogs.includes(`DESC: ${d}`));
        if (availableDescriptions.length === 0) availableDescriptions = descriptions;
        const selectedDescription = availableDescriptions[Math.floor(Math.random() * availableDescriptions.length)];

        // Increment schedule time by 15 minutes for each video
        const scheduleDate = new Date(baseScheduleDate.getTime() + index * 15 * 60 * 1000);

        try {
            console.log(`[Tab ${index + 1}] Navigating to YouTube Studio for ${videoPath}...`);
            await page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded' });

            const welcomeBtn = page.locator('#welcome-dialog #continue-button');
            if (await welcomeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
                await welcomeBtn.click();
            }

            await page.waitForSelector('#create-icon, #upload-icon, ytcp-button#create-icon', { timeout: 120000 });

            console.log(`[Tab ${index + 1}] Clicking Upload...`);
            if (await page.$('#upload-icon').catch(() => null)) {
                await page.click('#upload-icon');
            } else {
                await page.click('#create-icon');
                await page.click('tp-yt-paper-item:has-text("Upload videos")');
            }

            console.log(`[Tab ${index + 1}] Selecting file...`);
            const [fileChooser] = await Promise.all([
                page.waitForEvent('filechooser'),
                page.click('#select-files-button')
            ]);
            await fileChooser.setFiles(videoPath);

            await page.waitForSelector('#title-textarea #textbox', { state: 'visible', timeout: 60000 });
            await page.waitForTimeout(3000);

            console.log(`[Tab ${index + 1}] Filling details...`);
            const titleLocator = page.locator('#title-textarea #textbox').first();
            await titleLocator.click();
            await page.waitForTimeout(500);
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Backspace');
            await page.waitForTimeout(500);
            await titleLocator.fill(selectedTitle);

            const descLocator = page.locator('#description-textarea #textbox').first();
            await descLocator.click();
            await page.waitForTimeout(500);
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Backspace');
            await page.waitForTimeout(500);
            await descLocator.fill(selectedDescription);

            console.log(`[Tab ${index + 1}] Selecting "No, it's not made for kids"...`);
            try {
                await page.evaluate(() => {
                    const kidsRadio = document.querySelector('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]');
                    if (kidsRadio) kidsRadio.click();
                });
                await page.waitForTimeout(1000);
            } catch (e) {
                console.log(`[Tab ${index + 1}] Could not find kids option, might already be selected.`);
            }

            console.log(`[Tab ${index + 1}] Navigating to Visibility step...`);
            let foundSchedule = false;
            for (let i = 0; i < 6; i++) {
                if (await page.isVisible('tp-yt-paper-radio-button[name="SCHEDULE"]') || await page.isVisible('#schedule-radio-button') || await page.isVisible('text="Schedule"')) {
                    foundSchedule = true;
                    break;
                }
                
                try {
                    // Try clicking Next via JS to bypass actionability checks
                    await page.evaluate(() => {
                        const btn = document.querySelector('#next-button');
                        if (btn) btn.click();
                    });
                    await page.waitForTimeout(2500); // Give UI time to transition
                } catch (e) {
                    await page.waitForTimeout(1000);
                }
            }

            if (!foundSchedule) {
                throw new Error("Could not find Schedule radio button after clicking Next multiple times.");
            }

            console.log(`[Tab ${index + 1}] Selecting Schedule...`);
            try {
                // Try clicking the expand button for the Schedule container
                const expandBtn = page.locator('#second-container-expand-button');
                await expandBtn.scrollIntoViewIfNeeded();
                await expandBtn.click({ force: true });
            } catch (e) {
                console.log(`[Tab ${index + 1}] Error clicking schedule expand button, trying fallback...`);
                const scheduleLocator = page.locator('#schedule-radio-button, tp-yt-paper-radio-button[name="SCHEDULE"], #visibility-title:has-text("Schedule")').first();
                await scheduleLocator.scrollIntoViewIfNeeded();
                await scheduleLocator.click({ force: true });
            }
            await page.waitForTimeout(2000);

            console.log(`[Tab ${index + 1}] Setting Date...`);
            const dateString = scheduleDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            await page.locator('#datepicker-trigger').scrollIntoViewIfNeeded();
            await page.locator('#datepicker-trigger').click();
            await page.waitForTimeout(1000);
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Backspace');
            await page.keyboard.type(dateString, { delay: 50 });
            await page.keyboard.press('Enter');
            await page.waitForTimeout(500);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);

            console.log(`[Tab ${index + 1}] Setting Time...`);
            let hours = scheduleDate.getHours().toString().padStart(2, '0');
            let minutes = scheduleDate.getMinutes().toString().padStart(2, '0');
            let timeString = `${hours}:${minutes}`;
            await page.locator('#time-of-day-container #textbox, #time-of-day-container').first().scrollIntoViewIfNeeded();
            await page.locator('#time-of-day-container #textbox, #time-of-day-container').first().click();
            await page.waitForTimeout(1000);
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Backspace');
            await page.keyboard.type(timeString, { delay: 50 });
            await page.keyboard.press('Enter');
            await page.waitForTimeout(500);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);

            console.log(`[Tab ${index + 1}] Clicking final "Schedule" button...`);
            await page.waitForSelector('#done-button', { state: 'visible' });
            await page.click('#done-button');

            console.log(`[Tab ${index + 1}] Waiting for completion dialog or checks warning...`);
            
            for (let j = 0; j < 60; j++) {
                await page.waitForTimeout(1000);
                
                // 1. Check for "Got it" button and click if visible
                const gotItLocators = page.locator('ytcp-button:has-text("Got it"), ytcp-button:has-text("GOT IT"), button:has-text("Got it")');
                const gotItCount = await gotItLocators.count();
                for (let k = 0; k < gotItCount; k++) {
                    const btn = gotItLocators.nth(k);
                    if (await btn.isVisible().catch(() => false)) {
                        console.log(`[Tab ${index + 1}] "Still checking" warning appeared, clicking "Got it"...`);
                        await btn.click({ force: true });
                        await page.waitForTimeout(1000);
                        break;
                    }
                }

                // 2. Check for final completion dialog
                const isFinished = 
                    await page.isVisible('ytcp-video-share-dialog').catch(() => false) || 
                    await page.isVisible('ytcp-dialog:has-text("Video scheduled")').catch(() => false) || 
                    await page.isVisible('ytcp-dialog:has-text("Video uploading")').catch(() => false);
                    
                if (isFinished) {
                    console.log(`[Tab ${index + 1}] ✅ Scheduled successfully!`);
                    
                    const closeLocators = page.locator('#close-button, ytcp-button:has-text("Close"), button[aria-label="Close"]');
                    const closeCount = await closeLocators.count();
                    for (let k = 0; k < closeCount; k++) {
                        const btn = closeLocators.nth(k);
                        if (await btn.isVisible().catch(() => false)) {
                            await btn.click({ force: true });
                            await page.waitForTimeout(1000);
                            break;
                        }
                    }
                    break;
                }
            }

            fs.appendFileSync(usedLogPath, `TITLE: ${selectedTitle}\nDESC: ${selectedDescription}\nTIME: ${new Date().toISOString()}\n\n`);

        } catch (error) {
            console.error(`[Tab ${index + 1}] ❌ Error during automation for ${videoPath}:`, error.message);
            try {
                await page.screenshot({ path: `error_screenshot_${index + 1}.png` });
                const dialogText = await page.evaluate(() => document.body.innerText);
                fs.writeFileSync(`error_text_${index + 1}.txt`, dialogText);
                const html = await page.content();
                fs.writeFileSync(`error_html_${index + 1}.html`, html);
            } catch (e) {
                // Ignore screenshot error if page is closed
            }
        }
    };

    // Run all uploads concurrently
    await Promise.all(files.map((file, index) => uploadVideo(file, index)));

    console.log('\n🎉 All videos processed and scheduled!');
    console.log('⚠️ IMPORTANT: The browser is kept open so uploads can finish in the background.');
    console.log('DO NOT close this terminal or the browser until all videos reach 100% uploaded in YouTube Studio.');
    
    // Keep script alive infinitely
    await new Promise(() => {});
})();
