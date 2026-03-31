const { chromium } = require('playwright');
const { OpenAI } = require('openai');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/database');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────
// Scrape une page exposants et extrait les données
// ─────────────────────────────────────────────
async function scrapeExhibitors(sessionId, url) {
  let browser;
  try {
    // Mise à jour statut
    await db('sessions').where({ id: sessionId }).update({ status: 'scraping', updated_at: new Date().toISOString() });

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // User-agent réaliste pour éviter les blocages
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
    });

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Scroll pour déclencher le lazy-loading
    await autoScroll(page);

    // Récupérer le HTML nettoyé
    const html = await page.evaluate(() => {
      // Supprimer les balises inutiles
      ['script', 'style', 'nav', 'footer', 'head'].forEach(tag => {
        document.querySelectorAll(tag).forEach(el => el.remove());
      });
      return document.body.innerText.substring(0, 80000); // Limite tokens
    });

    await browser.close();
    browser = null;

    // ── Extraction via GPT-4.1 ──
    await db('sessions').where({ id: sessionId }).update({ status: 'extracting', updated_at: new Date().toISOString() });

    const extracted = await extractWithGPT(html, url);

    // ── Insertion en base ──
    const rows = extracted.map(ex => ({
      id: uuidv4(),
      session_id: sessionId,
      name: ex.name || null,
      description: ex.description || null,
      website: ex.website || null,
      logo: ex.logo || null,
      stand: ex.stand || null,
      country: ex.country || null,
      linkedin: ex.linkedin || null,
      twitter: ex.twitter || ex.x || null,
      categories: JSON.stringify(ex.categories || []),
      email: ex.email || null,
      phone: ex.phone || null,
      raw_data: JSON.stringify(ex),
      created_at: new Date().toISOString()
    }));

    for (let i = 0; i < rows.length; i += 50) {
      await db('exhibitors').insert(rows.slice(i, i + 50));
    }

    await db('sessions').where({ id: sessionId }).update({ status: 'completed', updated_at: new Date().toISOString() });

    return extracted.length;

  } catch (err) {
    if (browser) await browser.close();
    await db('sessions').where({ id: sessionId }).update({
      status: 'error',
      error: err.message,
      updated_at: new Date().toISOString()
    });
    throw err;
  }
}

// ─────────────────────────────────────────────
// GPT-4.1 extrait les exposants du texte brut
// ─────────────────────────────────────────────
async function extractWithGPT(pageText, url) {
  const prompt = `Tu es un expert en extraction de données structurées.

Analyse ce texte extrait de la page web "${url}" qui liste des exposants d'un salon/événement.

Extrais TOUS les exposants trouvés et retourne UNIQUEMENT un tableau JSON valide.
Chaque exposant doit avoir ces champs (null si non trouvé) :
- name: string
- description: string
- website: string (URL complète)
- logo: string (URL de l'image)
- stand: string (numéro/emplacement du stand)
- country: string (pays en français)
- linkedin: string (URL)
- twitter: string (URL ou handle)
- categories: array de strings (secteurs, tags, domaines)
- email: string
- phone: string

Texte de la page :
${pageText}

Retourne UNIQUEMENT le JSON, sans explication ni markdown.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 16000,
    response_format: { type: 'json_object' }
  });

  try {
    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);
    // GPT retourne parfois { exhibitors: [...] } ou directement [...]
    return Array.isArray(parsed) ? parsed : (parsed.exhibitors || parsed.data || []);
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────
// Scroll automatique pour le lazy-loading
// ─────────────────────────────────────────────
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
      // Sécurité : max 15 secondes de scroll
      setTimeout(() => { clearInterval(timer); resolve(); }, 15000);
    });
  });
}

module.exports = { scrapeExhibitors };
