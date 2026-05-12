const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '../OUTPUTY');
// The script will look for all mp4 files in the parent OUTPUTY directory

// Natural sort helper to ensure Part 1 comes before Part 10
const naturalSort = (a, b) => {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
};

const files = fs.existsSync(outputDir) 
    ? fs.readdirSync(outputDir)
        .filter(f => f.endsWith('.mp4'))
        .sort(naturalSort)
        .map(f => path.join(outputDir, f)) 
    : [];

if (files.length === 0) {
    console.log(`No .mp4 files found in ${outputDir}`);
    process.exit(0);
}

// Load captions templates
const readLines = (filePath) => {
    if (!fs.existsSync(filePath)) return [];
    // Read and remove the existing hashtags if we want to add random ones
    return fs.readFileSync(filePath, 'utf8').split('===').map(l => {
        let text = l.trim();
        // Remove existing hashtags to avoid clutter, we will add them dynamically
        return text.split('#')[0].trim();
    }).filter(l => l.length > 0);
};

const captionsPath = path.join(__dirname, 'captions.txt');
const captionTemplates = readLines(captionsPath);

const hashtags = [
    "#movies", "#movieclips", "#cinema", "#shorts", "#film", "#movie", 
    "#highlights", "#moviescene", "#movietok", "#clips", "#viral", 
    "#trending", "#explore", "#mustwatch", "#blockbuster", "#hollywood", 
    "#scene", "#entertainment", "#drama", "#comedy", "#action", "#topmovies",
    "#cinephile", "#moviemoments", "#epicscenes", "#movielover", "#reels", "#instagram"
];

const getRandomHashtags = (count = 12) => {
    const shuffled = [...hashtags].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).join(' ');
};

const generateCaption = (filePath) => {
    const fileName = path.basename(filePath, '.mp4'); // e.g. "Bro Daddy Part 1"
    const template = captionTemplates.length > 0 
        ? captionTemplates[Math.floor(Math.random() * captionTemplates.length)]
        : "Check out this amazing scene!";
    
    return `${fileName} 🍿🎬\n\n${template}\n.\n.\n.\n${getRandomHashtags()}`;
};

const usedLogPath = path.join(__dirname, 'used_insta.log');
let usedLogs = [];
if (fs.existsSync(usedLogPath)) {
    usedLogs = fs.readFileSync(usedLogPath, 'utf8').split('\n').map(l => l.trim());
}

(async () => {
    const userDataDir = path.join(__dirname, '../user-data-insta');
    console.log(`Found ${files.length} videos in ${outputDir}. Launching browser for Instagram...`);
    console.log(`(Opening tabs will be staggered by 10 seconds to prevent browser crashing from heavy load)`);

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

    const uploadInstagram = async (videoPath, index) => {
        // No longer staggering here as we do it in the main loop
        const page = await context.newPage();
        page.setDefaultTimeout(240000); // 4 minutes timeout per tab
        
        const selectedCaption = generateCaption(videoPath);

        try {
            console.log(`[Tab ${index + 1}] Navigating to Instagram for ${videoPath}...`);
            await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });

            // Wait for user to log in if they aren't. We can check for "New post" button
            // If it doesn't appear, user needs to log in manually the first time.
            console.log(`[Tab ${index + 1}] Looking for "New post" button (You may need to log in if this is the first run)...`);
            
            // Robust Create -> Post sequence with retries
            let selectionSuccessful = false;
            for (let retry = 0; retry < 3; retry++) {
                console.log(`[Tab ${index + 1}] Create-Post attempt ${retry + 1}...`);
                
                // 1. Find and click "Create"
                console.log(`[Tab ${index + 1}] Looking for Create button...`);
                const createBtn = page.getByRole('link', { name: /Create/i }).or(page.getByRole('button', { name: /Create/i })).or(page.getByLabel('New post')).or(page.getByLabel('Create')).first();
                
                if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
                    console.log(`[Tab ${index + 1}] Found Create button, clicking...`);
                    await createBtn.click({ force: true });
                    await page.waitForTimeout(2000);
                } else {
                    // Fallback to text search
                    const fallbackCreate = page.locator('text=Create').first();
                    if (await fallbackCreate.isVisible({ timeout: 2000 }).catch(() => false)) {
                        await fallbackCreate.click({ force: true });
                        await page.waitForTimeout(2000);
                    }
                }

                // Check if we are already at file selection
                if (await page.getByRole('button', { name: 'Select from computer' }).isVisible({ timeout: 3000 })) {
                    selectionSuccessful = true;
                    break;
                }

                // 2. Look for "Post" in the dropdown menu
                console.log(`[Tab ${index + 1}] Looking for "Post" option...`);
                // The user said "the button name is post"
                const postBtn = page.getByRole('menuitem', { name: 'Post' }).or(page.getByText('Post', { exact: true })).first();
                
                if (await postBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
                    console.log(`[Tab ${index + 1}] Found Post menu item, clicking...`);
                    await postBtn.click({ force: true });
                    await page.waitForTimeout(2000);
                    selectionSuccessful = true;
                }

                if (selectionSuccessful) break;
                
                // DEBUG: If we can't find it, let's see what IS on the page
                console.log(`[Tab ${index + 1}] ⚠️ Menu items not found. Retrying...`);
                const allTexts = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('span, div, a, button'))
                        .map(el => el.innerText.trim())
                        .filter(t => t.length > 0 && t.length < 30)
                        .slice(0, 30);
                });
                console.log(`[Tab ${index + 1}] Page texts: ${allTexts.join(' | ')}`);

                await page.mouse.click(10, 10); 
                await page.waitForTimeout(1000);
            }

            console.log(`[Tab ${index + 1}] Selecting file...`);
            const [fileChooser] = await Promise.all([
                page.waitForEvent('filechooser'),
                page.getByRole('button', { name: 'Select from computer' }).click()
            ]);
            await fileChooser.setFiles(videoPath);

            await page.waitForTimeout(3000);

            console.log(`[Tab ${index + 1}] Setting aspect ratio to 9:16...`);
            try {
                // Click the crop button (bottom left of the preview)
                // It can be a button or an svg
                const cropSelectors = [
                    'button:has(svg[aria-label="Select crop"])',
                    'svg[aria-label="Select crop"]',
                    'div[role="button"]:has(svg[aria-label="Select crop"])',
                    'text=Select crop'
                ];
                
                let cropBtn = null;
                for (const sel of cropSelectors) {
                    const loc = page.locator(sel).first();
                    if (await loc.isVisible({ timeout: 2000 }).catch(() => false)) {
                        cropBtn = loc;
                        break;
                    }
                }

                if (cropBtn) {
                    await cropBtn.click();
                    await page.waitForTimeout(1000);
                    
                    // Click the 9:16 ratio option
                    const ratio916 = page.getByText('9:16', { exact: true }).or(page.locator('span:has-text("9:16")')).first();
                    if (await ratio916.isVisible({ timeout: 5000 })) {
                        await ratio916.click();
                        console.log(`[Tab ${index + 1}] ✅ Aspect ratio set to 9:16`);
                    } else {
                        console.log(`[Tab ${index + 1}] ⚠️ Could not find 9:16 option in menu`);
                    }
                } else {
                    console.log(`[Tab ${index + 1}] ⚠️ Could not find "Select crop" button`);
                }
            } catch (e) {
                console.log(`[Tab ${index + 1}] Aspect ratio step error:`, e.message);
            }

            console.log(`[Tab ${index + 1}] Clicking Next (Filters step)...`);
            await page.getByRole('button', { name: 'Next' }).click();
            await page.waitForTimeout(2000);

            console.log(`[Tab ${index + 1}] Clicking Next (Details step)...`);
            await page.getByRole('button', { name: 'Next' }).click();
            await page.waitForTimeout(2000);

            console.log(`[Tab ${index + 1}] Entering caption...`);
            // Instagram caption box uses aria-label="Write a caption..."
            const captionBox = page.getByRole('textbox', { name: 'Write a caption...' });
            await captionBox.click();
            await page.waitForTimeout(500);
            
            await captionBox.fill(selectedCaption);
            
            await page.waitForTimeout(1000);

            console.log(`[Tab ${index + 1}] Clicking Share...`);
            await page.getByRole('button', { name: 'Share' }).first().click();

            console.log(`[Tab ${index + 1}] Waiting for upload to finish...`);
            await page.waitForSelector('text="Your post has been shared."', { timeout: 300000 }); // Wait up to 5 minutes for upload
            
            console.log(`[Tab ${index + 1}] ✅ Shared successfully!`);
            
            fs.appendFileSync(usedLogPath, `CAPTION: ${selectedCaption}\nTIME: ${new Date().toISOString()}\n\n`);

            // Optionally close the modal
            try {
                await page.locator('svg[aria-label="Close"]').locator('..').click();
            } catch (e) {}

        } catch (error) {
            console.error(`[Tab ${index + 1}] ❌ Error during automation for ${videoPath}:`, error.message);
            try {
                await page.screenshot({ path: path.join(__dirname, `error_screenshot_${index + 1}.png`) });
            } catch (e) {
                // Ignore screenshot error if page is closed
            }
        }
    };

    // Run uploads by opening a new tab every 30 seconds
    console.log(`\n🚀 Starting staggered uploads for ${files.length} videos...`);
    console.log(`(Opening a new tab every 30 seconds as requested)`);
    
    const uploadTasks = [];
    for (let i = 0; i < files.length; i++) {
        console.log(`\n[Video ${i + 1}/${files.length}] Triggering upload in new tab: ${path.basename(files[i])}`);
        
        // Start the upload without awaiting its completion
        const task = uploadInstagram(files[i], i).then(() => {
            console.log(`\n[Tab ${i + 1}] Finished task.`);
        });
        uploadTasks.push(task);

        // If it's not the last file, wait 30 seconds before opening the next tab
        if (i < files.length - 1) {
            console.log(`Waiting 30 seconds before opening the next tab...`);
            await new Promise(r => setTimeout(r, 30000));
        }
    }

    console.log('\n⏳ All upload tabs have been opened. Waiting for them to complete their work...');
    await Promise.all(uploadTasks);
    
    console.log('\n🎉 All videos processed for Instagram!');
    
    // Close context
    await context.close();
    process.exit(0);
})();
