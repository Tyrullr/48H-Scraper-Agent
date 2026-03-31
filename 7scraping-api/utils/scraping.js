const { chromium } = require('playwright');
const TurndownService = require('turndown');
const { OpenAI } = require('openai');
const fs = require('fs');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function normalizeText(value) {
  if (!value) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function normalizeCategories(value) {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  if (typeof value !== 'string') return [];
  return value
    .split(/[,|;\/\\]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeString(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

async function extractExhibitorData(pageText, urlProfil) {
  const prompt = `Tu es un assistant expert en extraction de fiches exposants.

Analyse le texte de la page de l'exposant et retourne UNIQUEMENT un objet JSON valide avec ces champs :
- name
- description
- website
- logo
- stand
- country
- linkedin
- twitter
- categories
- email
- phone

Si un champ est manquant, renvoie null.

URL de la page : ${urlProfil}

Texte de la page :
${pageText}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.0,
    max_tokens: 3000,
    response_format: { type: 'json_object' }
  });

  const content = response.choices?.[0]?.message?.content || '{}';
  let parsed = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = {};
  }

  return {
    id: null,
    name: normalizeString(parsed.name),
    description: normalizeString(parsed.description),
    website: normalizeString(parsed.website),
    logo: normalizeString(parsed.logo),
    stand: normalizeString(parsed.stand),
    country: normalizeString(parsed.country),
    linkedin: normalizeString(parsed.linkedin),
    twitter: normalizeString(parsed.twitter),
    categories: normalizeCategories(parsed.categories),
    email: normalizeString(parsed.email),
    phone: normalizeString(parsed.phone),
    url: urlProfil
  };
}

async function scrapeExhibitors(urlDepart, maxPages = 2, options = {}) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(urlDepart, { waitUntil: 'domcontentloaded', timeout: 30000 });

  let tousLesLiens = new Set();
  let navigationActive = true;
  let numeroPage = 1;

  const motsClesProfil = [
    'exhibitor', 'sponsor', 'partner', 'company',
    'profile', 'appearance', 'speaker', 'intervenant', 'startup'
  ];

  while (navigationActive && numeroPage <= maxPages) {
    await page.waitForTimeout(3000);

    let hauteurPrecedente = 0;
    let nouvelleHauteur = await page.evaluate(() => document.body.scrollHeight);

    while (hauteurPrecedente !== nouvelleHauteur) {
      hauteurPrecedente = nouvelleHauteur;
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
      nouvelleHauteur = await page.evaluate(() => document.body.scrollHeight);
    }

    const liensBruts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .map(a => a.href)
        .filter(href => href && href.startsWith('http'));
    });

    liensBruts.forEach(lien => {
      const urlMin = lien.toLowerCase();
      const contientMotCle = motsClesProfil.some(mot => urlMin.includes(mot));
      const estUnProfil = urlMin.split('/').length > 3;
      if (contientMotCle && estUnProfil) {
        tousLesLiens.add(lien);
      }
    });

    const boutonClique = await page.evaluate(() => {
      const motsCles = ['next', 'suivant', '>', '»', 'load more', 'voir plus', 'next page'];
      const elementsPossibles = Array.from(document.querySelectorAll('a, button, [role="button"], li'));

      for (const el of elementsPossibles) {
        const texte = (el.textContent || '').toLowerCase().trim();
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase().trim();
        const titre = (el.getAttribute('title') || '').toLowerCase().trim();
        const estVisible = el.offsetWidth > 0 && el.offsetHeight > 0;
        if (estVisible && (motsCles.includes(texte) || motsCles.some(mot => ariaLabel.includes(mot) || titre.includes(mot)))) {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
          el.click();
          return true;
        }
      }
      return false;
    });

    if (boutonClique) {
      numeroPage += 1;
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(5000);
    } else {
      navigationActive = false;
    }
  }

  const listeFinaleUrls = Array.from(tousLesLiens);
  const turndownService = new TurndownService();
  const donneesExtraites = [];

  for (let i = 0; i < listeFinaleUrls.length; i += 1) {
    const urlProfil = listeFinaleUrls[i];
    const pageContext = await browser.newContext();
    const pageProfil = await pageContext.newPage();

    await pageProfil.route('**/*', route => {
      if (['image', 'media', 'font'].includes(route.request().resourceType())) route.abort();
      else route.continue();
    });

    try {
      await pageProfil.goto(urlProfil, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const texteBrut = await pageProfil.evaluate(() => {
        const body = document.body.cloneNode(true);
        body.querySelectorAll('script, style, nav, footer, header, svg').forEach(el => el.remove());
        return body.innerText || '';
      });

      const pageText = normalizeText(texteBrut).slice(0, 120000);
      const markdown = turndownService.turndown(pageText);
      const exposant = await extractExhibitorData(markdown, urlProfil);
      donneesExtraites.push(exposant);
    } catch (err) {
      console.warn(`Echec de lecture de la fiche ${urlProfil} : ${err.message}`);
    } finally {
      await pageContext.close();
    }
  }

  await browser.close();

  if (options.saveJson) {
    fs.writeFileSync('Data_ia.json', JSON.stringify(donneesExtraites, null, 2));
  }

  return donneesExtraites;
}

if (require.main === module) {
  scrapeExhibitors('https://vivatech.com/exhibitors/').then(results => {
    console.log(`Extraits ${results.length} fiches.`);
  }).catch(err => {
    console.error('Erreur lors du scraping :', err);
    process.exit(1);
  });
}

module.exports = { scrapeExhibitors };
