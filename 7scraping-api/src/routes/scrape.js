const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/database');
const { scrapeExhibitors } = require('../services/scraper');

// POST /api/scrape — Lance un scraping
router.post('/', async (req, res) => {
  const { url } = req.body;

  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'URL invalide. Exemple: https://www.mwcbarcelona.com/exhibitors' });
  }

  const sessionId = uuidv4();
  await db('sessions').insert({ id: sessionId, url, status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });

  scrapeExhibitors(sessionId, url)
    .then(count => console.log(`✅ Session ${sessionId}: ${count} exposants extraits`))
    .catch(err => console.error(`❌ Session ${sessionId}:`, err.message));

  res.status(202).json({
    session_id: sessionId,
    status: 'pending',
    message: 'Scraping lancé. Consultez GET /api/sessions/:id pour suivre la progression.'
  });
});

module.exports = router;
