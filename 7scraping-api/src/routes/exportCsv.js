const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { scrapeExhibitors } = require('../../utils/scraping');

function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
}

function toCsv(rows) {
  const columns = [
    'id',
    'name',
    'description',
    'website',
    'logo',
    'stand',
    'country',
    'linkedin',
    'twitter',
    'categories',
    'email',
    'phone'
  ];

  const header = columns.join(',');
  const lines = rows.map(row => {
    const categories = Array.isArray(row.categories) ? row.categories.join(' | ') : row.categories;
    return [
      row.id,
      row.name,
      row.description,
      row.website,
      row.logo,
      row.stand,
      row.country,
      row.linkedin,
      row.twitter,
      categories,
      row.email,
      row.phone
    ].map(escapeCsvValue).join(',');
  });

  return [header, ...lines].join('\n');
}

router.get('/', async (req, res) => {
  const { session_id, url } = req.query;
  let targetUrl = url;

  if (!targetUrl) {
    if (!session_id) return res.status(400).json({ error: 'session_id ou url requis' });

    const session = await db('sessions').where({ id: session_id }).first();
    if (!session) return res.status(404).json({ error: 'Session introuvable' });
    targetUrl = session.url;
  }

  try {
    const exhibitors = await scrapeExhibitors(targetUrl, 2);
    const rows = exhibitors.map((row, index) => ({
      id: row.id || `exhibitor-${index + 1}`,
      name: row.name,
      description: row.description,
      website: row.website,
      logo: row.logo,
      stand: row.stand,
      country: row.country,
      linkedin: row.linkedin,
      twitter: row.twitter,
      categories: row.categories,
      email: row.email,
      phone: row.phone
    }));

    const csv = toCsv(rows);
    res.json({ csv, generated_by: 'scraping-utils' });
  } catch (err) {
    res.status(500).json({ error: 'Impossible de générer le CSV via scraping', detail: err.message });
  }
});

module.exports = router;
