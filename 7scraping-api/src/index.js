require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/api/scrape',     require('./routes/scrape'));
app.use('/api/exhibitors', require('./routes/exhibitors'));
app.use('/api/sessions',   require('./routes/sessions'));
app.use('/api/chat',       require('./routes/chat'));
app.use('/api/export-csv', require('./routes/exportCsv'));

app.get('/', (req, res) => {
  res.json({
    name: 'Exhibitors API',
    version: '1.0.0',
    routes: {
      'POST   /api/scrape':                   'Lancer un scraping depuis une URL',
      'GET    /api/sessions':                  'Lister toutes les sessions',
      'GET    /api/sessions/:id':              'Statut d\'une session',
      'DELETE /api/sessions/:id':              'Supprimer une session',
      'GET    /api/exhibitors?session_id=':    'Lister les exposants (filtres: country, category, q)',
      'GET    /api/exhibitors/:id':            'Détail d\'un exposant',
      'POST   /api/chat':                      'Chat avec l\'agent IA',
      'GET    /api/chat/history/:session_id':  'Historique de la conversation',
      'DELETE /api/chat/history/:session_id':  'Effacer la conversation',
      'GET    /api/export-csv?session_id=':     'Exporter les exposants en CSV via IA',
    }
  });
});

app.use((err, req, res, next) => {
  console.error('Erreur:', err);
  res.status(500).json({ error: 'Erreur interne', detail: err.message });
});

// Démarrer après l'init de la DB
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Exhibitors API démarrée sur http://localhost:${PORT}`);
    console.log(`📖 Routes disponibles sur http://localhost:${PORT}/\n`);
  });
}).catch(err => {
  console.error('❌ Erreur init DB:', err);
  process.exit(1);
});
