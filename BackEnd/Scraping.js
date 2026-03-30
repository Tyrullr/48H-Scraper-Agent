const { chromium } = require('playwright');
const fs = require('fs');

async function crawlerCatalogueComplet(urlDeDepart) {
  // headless: false permet de voir le navigateur s'ouvrir (pratique pour deboguer)
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Utilisation d'un Set pour stocker les liens et eviter les doublons automatiques
  let tousLesLiens = new Set();
  let paginationActive = true;

  console.log("Etape 1 : Demarrage de l'exploration des pages listes...");
  await page.goto(urlDeDepart, { waitUntil: 'networkidle' });

  // --- PHASE 1 : PARCOURIR LA PAGINATION ET RECOLTER LES LIENS ---
  while (paginationActive) {
    console.log("Analyse de la page en cours...");

    // 1. Trouver tous les liens vers les profils exposants
    // ATTENTION : Le selecteur 'a.profile-link' doit etre adapte selon le site web cible
    const liensSurLaPage = await page.$$eval('a.profile-link', anchors => anchors.map(a => a.href));
    liensSurLaPage.forEach(lien => tousLesLiens.add(lien));

    // 2. Chercher le bouton "Page suivante"
    // Le selecteur '.next-page-btn' changera aussi selon le site
    const boutonSuivant = await page.$('.next-page-btn');

    if (boutonSuivant) {
      console.log("Bouton 'Suivant' trouve, clic en cours...");
      await boutonSuivant.click();
      
      // Crucial : attendre que le nouveau contenu JS soit charge apres le clic
      await page.waitForLoadState('networkidle');
      // Une petite pause supplementaire pour eviter les blocages anti-bot
      await page.waitForTimeout(2000); 
    } else {
      console.log("Plus de bouton 'Suivant'. Fin de l'exploration.");
      paginationActive = false;
    }
  }

  const listeFinaleLiens = Array.from(tousLesLiens);
  console.log(`Bilan Phase 1 : ${listeFinaleLiens.length} profils uniques trouves.`);

  // --- PHASE 2 : VISITER CHAQUE PROFIL EN PROFONDEUR ---
  console.log("Etape 2 : Extraction des donnees de chaque profil...");
  let donneesGlobales = [];

  for (const lienProfil of listeFinaleLiens) {
    console.log(`Ouverture de : ${lienProfil}`);
    await page.goto(lienProfil, { waitUntil: 'networkidle' });

    // Ici, vous appliquez la logique d'extraction brute vue precedemment
    const texteBrut = await page.$eval('body', el => {
      // Nettoyage rapide
      el.querySelectorAll('nav, footer, script, style').forEach(n => n.remove());
      return el.innerText.trim();
    });

    // Sauvegarde temporaire en memoire
    donneesGlobales.push({
      url: lienProfil,
      contenu: texteBrut
    });

    await page.waitForTimeout(1000); // Pause anti-bannissement
  }

  await browser.close();

  // --- PHASE 3 : EXPORT ---
  // On sauvegarde tout dans un gros fichier JSON que l'equipe IA pourra lire
  fs.writeFileSync('export_brut_exposants.json', JSON.stringify(donneesGlobales, null, 2));
  console.log("Mission terminee : Fichier export_brut_exposants.json cree !");
}

// Lancement du crawler global
crawlerCatalogueComplet('https://www.mwcbarcelona.com/exhibitors');