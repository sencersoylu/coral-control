/**
 * HTML → PDF render (puppeteer-core + sistem Chromium'u).
 * Chromium yolu: PUPPETEER_EXECUTABLE_PATH env > config.chromiumPath >
 * bilinen yollar. Tarayıcı her render için açılıp kapatılır — rapor
 * üretimi seyrek olduğundan kalıcı instance tutulmaz.
 */
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const KNOWN_CHROMIUM_PATHS = [
	'/usr/bin/chromium-browser', // Raspberry Pi OS / Debian
	'/usr/bin/chromium',
	'/usr/bin/google-chrome',
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS dev
	'/Applications/Chromium.app/Contents/MacOS/Chromium',
];

function resolveChromiumPath() {
	const candidates = [
		process.env.PUPPETEER_EXECUTABLE_PATH,
		global.appConfig && global.appConfig.chromiumPath,
		...KNOWN_CHROMIUM_PATHS,
	].filter(Boolean);

	for (const p of candidates) {
		try {
			if (fs.existsSync(p)) return p;
		} catch {
			/* yoksay */
		}
	}
	throw new Error(
		'Chromium bulunamadı. PUPPETEER_EXECUTABLE_PATH env değişkenini veya config.chromiumPath değerini ayarlayın.'
	);
}

/**
 * @param {string} html
 * @returns {Promise<Buffer>} A4 PDF
 */
async function htmlToPdf(html) {
	const executablePath = resolveChromiumPath();
	const browser = await puppeteer.launch({
		executablePath,
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
	});
	try {
		const page = await browser.newPage();
		await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
		const pdf = await page.pdf({
			format: 'A4',
			printBackground: true,
			margin: { top: '10mm', bottom: '10mm', left: '8mm', right: '8mm' },
		});
		return Buffer.from(pdf);
	} finally {
		await browser.close();
	}
}

module.exports = { htmlToPdf };
