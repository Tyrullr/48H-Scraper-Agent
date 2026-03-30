const { chromium } = require('playwright');
const cheerio = require('cheerio');

async function ScraperAndClean(url) {
    try{
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        console.log("Chargement de la page web en cours...");

        await page.goto(url, { waitUntil: 'networkidle' });

        const htmlContent = await page.content();
        await browser.close();

        const cheerioncleaner = cheerio.load(htmlContent);

        cheerioncleaner('script, style, nav, footer, header').remove();

        const cleanText = cheerioncleaner('body').text().replace(/\s+/g, ' ').trim();
        return cleanText;

    } catch (error) {
        console.error("Une erreur s'est produite lors du scraping :", error);
        return "Une erreur s'est produite lors du scraping :" + error.message;
    }
}

ScraperAndClean('https://www.cloudflare.com/fr-fr/learning/bots/how-captchas-work/').then(text => {
  console.log("Texte extrait de la page :");
  console.log(text);
});