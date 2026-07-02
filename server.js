const express = require('express');
const puppeteer = require('puppeteer');

const app = express();

app.use(express.json({ limit: '25mb' }));

let browserPromise = null;

async function getBrowser() {
    if (!browserPromise) {
        browserPromise = launchBrowser();
    }
    let browser = await browserPromise;
    if (!browser.connected) {
        browserPromise = launchBrowser();
        browser = await browserPromise;
    }
    return browser;
}

function launchBrowser() {
    return puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
}

function checkApiKey(req, res, next) {
    if (req.headers['x-api-key'] !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

app.post('/html-to-pdf', checkApiKey, async (req, res) => {
    const { html } = req.body;

    if (!html) {
        return res.status(400).json({ error: 'Missing "html" in request body' });
    }

    let page;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
        });

        res.json({ pdfBase64: pdfBuffer.toString('base64') });

    } catch (err) {
        console.error('PDF generation failed:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (page) await page.close();
    }
});

app.get('/', (req, res) => res.send('PDF service is running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`PDF service listening on port ${PORT}`);
    getBrowser().catch(e => console.error('Browser warmup failed:', e));
});
