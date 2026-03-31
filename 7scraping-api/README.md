# Exhibitors API

API de scraping et chat IA pour extraire et interroger les exposants d'un salon.

## Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Installer les navigateurs Playwright
npx playwright install chromium

# 3. Configurer les variables d'environnement
cp .env.example .env
# → Ouvrir .env et renseigner votre clé OpenAI

# 4. Lancer le serveur
npm run dev        # développement (avec rechargement auto)
npm start          # production
```

## Utilisation

### 1. Lancer un scraping

```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.mwcbarcelona.com/exhibitors"}'

# Réponse : { "session_id": "abc-123", "status": "pending" }
```

### 2. Suivre la progression

```bash
curl http://localhost:3000/api/sessions/abc-123

# Statuts : pending → scraping → extracting → completed / error
```

### 3. Consulter les exposants

```bash
# Tous les exposants
curl "http://localhost:3000/api/exhibitors?session_id=abc-123"

# Filtrer par pays
curl "http://localhost:3000/api/exhibitors?session_id=abc-123&country=France"

# Filtrer par catégorie
curl "http://localhost:3000/api/exhibitors?session_id=abc-123&category=Mode"

# Recherche libre
curl "http://localhost:3000/api/exhibitors?session_id=abc-123&q=tesla"
```

### 4. Chatter avec l'agent IA

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "abc-123",
    "message": "Quels exposants travaillent dans la mode ?"
  }'
```

### 5. Supprimer une session

```bash
curl -X DELETE http://localhost:3000/api/sessions/abc-123
```

## Structure du projet

```
exhibitors-api/
├── src/
│   ├── index.js              # Serveur Express
│   ├── db/
│   │   └── database.js       # Init SQLite + schéma
│   ├── routes/
│   │   ├── scrape.js         # POST /api/scrape
│   │   ├── exhibitors.js     # GET  /api/exhibitors
│   │   ├── sessions.js       # GET/DELETE /api/sessions
│   │   └── chat.js           # POST /api/chat
│   └── services/
│       ├── scraper.js        # Playwright + GPT-4.1 extraction
│       └── chatAgent.js      # Agent conversationnel GPT-4.1
├── data/                     # Base SQLite (créée automatiquement)
│   └── exhibitors.db
├── .env                      # Vos clés (ne pas committer)
├── .env.example
└── package.json
```

## Variables d'environnement

| Variable        | Description                        | Exemple                        |
|-----------------|------------------------------------|--------------------------------|
| `OPENAI_API_KEY`| Votre clé API OpenAI               | `sk-proj-xxxx`                 |
| `PORT`          | Port du serveur (défaut: 3000)     | `3000`                         |
| `DB_PATH`       | Chemin de la base SQLite           | `./data/exhibitors.db`         |

## Notes importantes

- Le scraping peut prendre **30 secondes à 3 minutes** selon la taille du salon
- Certains sites bloquent les bots : dans ce cas, le texte extrait sera partiel
- GPT-4.1 est utilisé pour **l'extraction intelligente** des champs ET le **chat**
- L'historique de conversation est sauvegardé en base par session
