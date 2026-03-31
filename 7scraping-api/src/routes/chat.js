const express = require('express');
const router = express.Router();
const { chat } = require('../services/chatAgent');
const { db } = require('../db/database');

// POST /api/chat
router.post('/', async (req, res) => {
  const { session_id, message } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id requis' });
  if (!message || message.trim() === '') return res.status(400).json({ error: 'message requis' });

  try {
    const result = await chat(session_id, message.trim());
    res.json({ session_id, response: result.message, tokens_used: result.usage?.total_tokens || null });
  } catch (err) {
    res.status(err.message.includes('introuvable') ? 404 : 500).json({ error: err.message });
  }
});

// GET /api/chat/history/:session_id
router.get('/history/:session_id', async (req, res) => {
  const messages = await db('chat_messages')
    .where({ session_id: req.params.session_id })
    .orderBy('created_at', 'asc')
    .select('role', 'content', 'created_at');
  res.json({ session_id: req.params.session_id, messages });
});

// DELETE /api/chat/history/:session_id
router.delete('/history/:session_id', async (req, res) => {
  await db('chat_messages').where({ session_id: req.params.session_id }).delete();
  res.json({ message: 'Historique effacé' });
});

module.exports = router;
