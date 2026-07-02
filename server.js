const express = require('express');
const puppeteer = require('puppeteer');

const app = express();

// Allow large HTML payloads. The default limit is tiny (100kb),
// too small for a multi-record report, so we raise it.
app.use(express.json({ limit: '25mb' }));

// --- Security check ---
// Salesforce must send a secret header "x-api-key" that matches the
// API_KEY value you'll set in Heroku later. If it doesn't match, reject.
app.use((req, res, next) => {
    if (req.headers['x-api-key'] !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
});

// --- Reuse one browser instead of launching Chrome every time ---
// Launching Chrome per request is slow. We launch once and reuse it.
let browserPromise = null;

async function getBrowser() {
    if (!browserPromise) {
        browserPromise = launchBrowser();
    }
    let browser = await browserPromise;
    if (!browser.connected) {         // if the browser died, relaunch it
        browserPromise = launchBrowser();
        browser = await browserPromise;
    }
    return browser;
}

function launchBrowser() {
    return puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--single-process',
            '--no-zygote'
        ]
    });
}

// --- The main endpoint that Salesforce calls ---
app.post('/html-to-pdf', async (req, res) => {
    const { html } = req.body;

    if (!html) {
        return res.status(400).json({ error: 'Missing "html" in request body' });
    }

    let page;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();

        // Load the HTML. "networkidle0" waits for any images/fonts to load.
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
        });

        // Send the PDF back as Base64 text — the reliable way for
        // Salesforce Apex to receive binary data.
        res.json({ pdfBase64: pdfBuffer.toString('base64') });

    } catch (err) {
        console.error('PDF generation failed:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (page) await page.close(); // close the page, keep the browser
    }
});

// --- Health check ---
// Visiting the app's web address shows this message, confirming it's alive.
app.get('/', (req, res) => res.send('PDF service is running'));

// --- Start the server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`PDF service listening on port ${PORT}`);
    getBrowser().catch(e => console.error('Browser warmup failed:', e));
});
