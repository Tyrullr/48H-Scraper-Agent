const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

function formatExhibitor(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    website: row.website,
    logo: row.logo,
    stand: row.stand,
    country: row.country,
    linkedin: row.linkedin,
    twitter: row.twitter,
    categories: safeJSON(row.categories),
    email: row.email,
    phone: row.phone,
    created_at: row.created_at
  };
}

function safeJSON(str) {
  try { return JSON.parse(str); } catch { return []; }
}

// GET /api/exhibitors?session_id=xxx&country=France&category=Mode&q=tesla
router.get('/', async (req, res) => {
  const { session_id, country, category, q, limit = 100, offset = 0 } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id requis' });

  let query = db('exhibitors').where({ session_id });

  if (country)   query = query.whereILike('country', `%${country}%`);
  if (category)  query = query.whereILike('categories', `%${category}%`);
  if (q)         query = query.where(b => b.whereILike('name', `%${q}%`).orWhereILike('description', `%${q}%`));

  const total = await query.clone().count('id as count').first();
  const rows  = await query.orderBy('name', 'asc').limit(parseInt(limit)).offset(parseInt(offset));

  res.json({ total: total.count, count: rows.length, offset: parseInt(offset), exhibitors: rows.map(formatExhibitor) });
});

// GET /api/exhibitors/:id
router.get('/:id', async (req, res) => {
  const row = await db('exhibitors').where({ id: req.params.id }).first();
  if (!row) return res.status(404).json({ error: 'Exposant introuvable' });
  res.json(formatExhibitor(row));
});

module.exports = router;
