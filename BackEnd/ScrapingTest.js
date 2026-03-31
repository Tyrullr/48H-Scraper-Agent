const { chromium } = require('playwright');
const TurndownService = require('turndown');
const fs = require('fs');

async function lancerProjetScraping(urlDepart, maxPages = 2) {
  console.log("=== PHASE 1 : COLLECTE DES LIENS ===");
  
  const browser = await chromium.launch({ headless: true }); 
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Ouverture du site...");
  await page.goto(urlDepart, { waitUntil: 'domcontentloaded' });
  
  let tousLesLiens = new Set();
  let navigationActive = true;
  let numeroPage = 1;

  const motsClesProfil = [
    'exhibitor', 'sponsor', 'partner', 'company', 
    'profile', 'appearance', 'speaker', 'intervenant', 'startup'
  ];

  while (navigationActive && numeroPage <= maxPages) {
    console.log(`\n--- Analyse de la page ${numeroPage} ---`);
    await page.waitForTimeout(4000); 

    console.log("Defilement de la page pour activer le lazy-loading...");
    let hauteurPrecedente = 0;
    let nouvelleHauteur = await page.evaluate(() => document.body.scrollHeight);

    while (hauteurPrecedente !== nouvelleHauteur) {
      hauteurPrecedente = nouvelleHauteur;
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000); // Petite pause pour laisser les images apparaitre
      nouvelleHauteur = await page.evaluate(() => document.body.scrollHeight);
    }

    // 2. Extraction des liens exposants
    const liensBruts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
                  .map(a => a.href)
                  .filter(href => href && href.startsWith('http')); 
    });

    const tailleAvant = tousLesLiens.size;

    liensBruts.forEach(lien => {
      const urlMin = lien.toLowerCase();
      const contientMotCle = motsClesProfil.some(mot => urlMin.includes(mot));
      
      // Assouplissement du filtre de profondeur pour les urls type /startups/nom
      const estUnProfil = urlMin.split('/').length > 3; 
      
      if (contientMotCle && estUnProfil) {
        tousLesLiens.add(lien);
      }
    });

    console.log(`Nouveaux liens trouves : ${tousLesLiens.size - tailleAvant}. Total : ${tousLesLiens.size}`);

    if (tousLesLiens.size === tailleAvant && numeroPage > 1) {
      console.log("Aucun nouveau lien. Boucle infinie detectee. Fin de la navigation.");
      break;
    }

    // 3. Navigation (Recherche et Clic JS)
    console.log("Recherche du bouton 'Suivant' via JavaScript...");
    
    const boutonClique = await page.evaluate(() => {
      // Ajout de mots-cles specifiques a Web Summit si necessaire
      const motsCles = ['next', 'suivant', '>', '»', 'load more', 'voir plus', 'next page'];
      const elementsPossibles = Array.from(document.querySelectorAll('a, button, [role="button"], li'));
      
      for (const el of elementsPossibles) {
        const texte = (el.textContent || '').toLowerCase().trim();
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase().trim();
        const titre = (el.getAttribute('title') || '').toLowerCase().trim();
        
        const correspondText = motsCles.includes(texte);
        const correspondAria = motsCles.some(mot => ariaLabel.includes(mot) || titre.includes(mot));
        
        const estVisible = el.offsetWidth > 0 && el.offsetHeight > 0;
        
        if ((correspondText || correspondAria) && estVisible) {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
          el.click();
          return true; 
        }
      }
      return false; 
    });

    if (boutonClique) {
      console.log("Clic effectue avec succes ! Attente du rafraichissement...");
      numeroPage++;
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(5000); 
    } else {
      console.log("Aucun bouton 'Suivant' detecte par le JS. Fin du catalogue.");
      navigationActive = false;
    }
  }

  await context.close();
  const listeFinaleUrls = Array.from(tousLesLiens);

  console.log("\n=== PHASE 2 : ASPIRATION ET CONVERSION MARKDOWN ===");
  
  const turndownService = new TurndownService();
  let donneesExtraites = [];

  for (let i = 0; i < listeFinaleUrls.length; i++) {
    const urlProfil = listeFinaleUrls[i];
    console.log(`Scraping ${i + 1}/${listeFinaleUrls.length} : ${urlProfil}`);
    
    const pageContext = await browser.newContext();
    const pageProfil = await pageContext.newPage();
    
    await pageProfil.route('**/*', (route) => {
      if (['image', 'media', 'font'].includes(route.request().resourceType())) route.abort();
      else route.continue();
    });
    
    try {
      await pageProfil.goto(urlProfil, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      const htmlPropre = await pageProfil.$eval('body', body => {
        body.querySelectorAll('nav, footer, header, script, style, svg').forEach(el => el.remove());
        return body.innerHTML;
      });

      const texteMarkdown = turndownService.turndown(htmlPropre);
      
      donneesExtraites.push({
        url: urlProfil,
        markdown: texteMarkdown
      });

    } catch (erreur) {
      console.log(`Echec d'ouverture sur ${urlProfil}`);
    } finally {
      await pageContext.close();
    }
  }

  await browser.close();

  console.log("\n=== PHASE 3 : EXPORT EN JSON ===");
  fs.writeFileSync('Data_ia.json', JSON.stringify(donneesExtraites, null, 2));
  console.log("Succes ! Le fichier Data_ia.json a ete cree et rempli.");
}

lancerProjetScraping('https://vivatech.com/exhibitors/');