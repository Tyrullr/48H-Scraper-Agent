const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

// GET /api/sessions/:id
router.get('/:id', async (req, res) => {
  const session = await db('sessions').where({ id: req.params.id }).first();
  if (!session) return res.status(404).json({ error: 'Session introuvable' });

  const { count } = await db('exhibitors').where({ session_id: req.params.id }).count('id as count').first();
  const countries = await db('exhibitors')
    .where({ session_id: req.params.id })
    .whereNotNull('country')
    .groupBy('country')
    .orderBy('total', 'desc')
    .limit(10)
    .select('country', db.raw('COUNT(*) as total'));

  res.json({ id: session.id, url: session.url, status: session.status, error: session.error || null, exhibitors_count: count, top_countries: countries, created_at: session.created_at, updated_at: session.updated_at });
});

// GET /api/sessions
router.get('/', async (req, res) => {
  const sessions = await db('sessions as s')
    .leftJoin('exhibitors as e', 'e.session_id', 's.id')
    .groupBy('s.id')
    .orderBy('s.created_at', 'desc')
    .limit(20)
    .select('s.*', db.raw('COUNT(e.id) as exhibitors_count'));
  res.json({ sessions });
});

// DELETE /api/sessions/:id
router.delete('/:id', async (req, res) => {
  const session = await db('sessions').where({ id: req.params.id }).first();
  if (!session) return res.status(404).json({ error: 'Session introuvable' });
  await db('chat_messages').where({ session_id: req.params.id }).delete();
  await db('exhibitors').where({ session_id: req.params.id }).delete();
  await db('sessions').where({ id: req.params.id }).delete();
  res.json({ message: 'Session et données supprimées' });
});

module.exports = router;
