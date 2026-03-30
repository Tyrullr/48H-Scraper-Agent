# Exhibition Scraper Agent

Un Agent IA conversationnel conçu pour automatiser l'extraction des listes d'exposants depuis n'importe quel site de salon professionnel.

## Fonctionnalités
- **Scraping Intelligent** : Extraction de données structurées même sur des sites complexes grâce à la puissance des LLM et de Playwright.
- **Tableau Interactif** : Visualisation des résultats en temps réel avec options de tri et recherche.
- **Export de Données** : Téléchargement des listes aux formats CSV / XLSX.
- **UX Conversationnelle** : Interface de chat pour piloter l'agent.

## Stack Technique
- **Framework** : Next.js 14 (App Router)
- **Moteur AI** : Vercel AI SDK + OpenAI
- **Scraping** : Playwright & Cheerio
- **Persistance** : Système de stockage local basé sur JSON

## Architecture de Stockage (Backend)
- **Validation** : Schémas `zod` (`lib/types.js`) pour l'intégrité des données.
- **Persistance** : Fichiers JSON horodatés dans `.data/` via `lib/storage.js`.
- **API Interne** : Fonctions `saveResults(results)` et `listResults()`.

## Cadre Réglementaire
- Analyse limitée aux informations publiques (RGPD).
- Protection des données personnelles.
- Respect du rate limiting.