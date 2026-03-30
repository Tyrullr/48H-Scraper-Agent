const { Stagehand } = require('@browserbasehq/stagehand');
const { chromium } = require('playwright');
const TurndownService = require('turndown');
const fs = require('fs');
require('dotenv').config();

async function lancerExtractionComplete(urlDepart, maxPages = Infinity) {
  console.log("--- PHASE 1 : COLLECTE DES LIENS ---");
  
  const stagehand = new Stagehand({
    env: "LOCAL",
    apiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o-mini", 
    logger: () => {},
    localBrowserLaunchOptions: { 
      headless: true 
    }
  });
  
  await stagehand.init();
  const page = stagehand.context.activePage();

  console.log("Navigateur de l'Agent prêt. Navigation en cours...");
  await page.goto(urlDepart, { waitUntil: 'networkidle' });

  let tousLesLiens = new Set();
  let paginationActive = true;
  let numeroPage = 1;

  while (paginationActive) {
    console.log(`Analyse de la page ${numeroPage} par l'IA...`);
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    const liensDeLaPage = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
                    .map(a => a.href)
                    .filter(href => (href.includes('/exhibitors/') || href.includes('/appearances/')) && href.split('/').length > 4); 
    });

    const tailleAvantCollecte = tousLesLiens.size;

    if (liensDeLaPage.length > 0) {
      liensDeLaPage.forEach(lien => tousLesLiens.add(lien));
    }
    
    console.log(`${liensDeLaPage.length} liens trouves sur cette page. Total unique en memoire : ${tousLesLiens.size}`);

    if (tousLesLiens.size === tailleAvantCollecte && numeroPage > 1) {
      console.log("Aucun NOUVEAU lien detecte. Nous avons boucle sur la derniere page ! Fin de la collecte.");
      paginationActive = false;
      break;
    }

    if (numeroPage >= maxPages) {
      console.log(`Limite max de scrolls atteinte (${maxPages}). Fin de la collecte.`);
      paginationActive = false;
      break;
    }

    console.log(`Défilement vers le bas (Scroll n°${numeroPage}) pour charger la suite...`);
    
    const hauteurPrecedente = await page.evaluate(() => document.body.scrollHeight);
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const nouvelleHauteur = await page.evaluate(() => document.body.scrollHeight);

    try {
    } catch(e) {}

    if (nouvelleHauteur === hauteurPrecedente && tousLesLiens.size === tailleAvantCollecte) {
      console.log("Le scroll ne révèle plus rien de nouveau (bas de la page atteint). Fin de la collecte.");
      paginationActive = false;
    } else {
      numeroPage++;
    }
  }

  await stagehand.close();
  const listeFinaleUrls = Array.from(tousLesLiens);

  console.log("\n--- PHASE 2 : ASPIRATION DES PROFILS ---");
  
  const browser = await chromium.launch({ headless: true });
  const turndownService = new TurndownService();
  let donneesPourIA = [];

  for (let i = 0; i < listeFinaleUrls.length; i++) {
    const urlProfil = listeFinaleUrls[i];
    console.log(`Aspiration ${i + 1}/${listeFinaleUrls.length} : ${urlProfil}`);
    
    const context = await browser.newContext();
    const pageProfil = await context.newPage();
    
    await pageProfil.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    try {
      await pageProfil.goto(urlProfil, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      const htmlPropre = await pageProfil.$eval('body', body => {
        body.querySelectorAll('nav, footer, header, script, style, svg, iframe').forEach(el => el.remove());
        return body.innerHTML;
      });

      const texteMarkdown = turndownService.turndown(htmlPropre);
      
      donneesPourIA.push({
        source_url: urlProfil,
        contenu_markdown: texteMarkdown
      });

    } catch (erreur) {
      console.log(`Echec sur ${urlProfil}`);
    } finally {
      await context.close();
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  await browser.close();

  fs.writeFileSync('donnees_exposants_pretes_pour_IA.json', JSON.stringify(donneesPourIA, null, 2));
  console.log("\nMission terminee ! Fichier sauvegarde avec succes.");
}

const args = process.argv.slice(2);
const limitPages = args.length > 0 ? parseInt(args[0], 10) : Infinity;

if (limitPages !== Infinity) {
  console.log(`Lancement du script avec une limite de ${limitPages} page(s).`);
}

lancerExtractionComplete('https://vivatech.com/exhibitors', limitPages);