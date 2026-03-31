const { OpenAI } = require('openai');
const { db } = require('../db/database');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────
// Envoie un message à l'agent et retourne la réponse
// ─────────────────────────────────────────────
async function chat(sessionId, userMessage) {
  const session = await db('sessions').where({ id: sessionId }).first();
  if (!session) throw new Error('Session introuvable');
  if (session.status !== 'completed') throw new Error(`Session non prête (statut: ${session.status})`);

  const rows = await db('exhibitors').where({ session_id: sessionId });
  const exhibitors = rows.map(row => ({
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
    phone: row.phone
  }));

  const history = await db('chat_messages')
    .where({ session_id: sessionId })
    .orderBy('created_at', 'desc')
    .limit(20);
  history.reverse();

  const systemPrompt = buildSystemPrompt(session.url, exhibitors);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages,
    temperature: 0.4,
    max_tokens: 2000
  });

  const assistantMessage = response.choices[0].message.content;
  const now = new Date().toISOString();

  await db('chat_messages').insert([
    { session_id: sessionId, role: 'user',      content: userMessage,       created_at: now },
    { session_id: sessionId, role: 'assistant', content: assistantMessage,  created_at: now }
  ]);

  return { message: assistantMessage, usage: response.usage };
}

// ─────────────────────────────────────────────
// Construit le prompt système avec les données exposants
// ─────────────────────────────────────────────
function buildSystemPrompt(url, exhibitors) {
  const count = exhibitors.length;
  const exhibitorsJSON = JSON.stringify(exhibitors, null, 2);

  return `Tu es un assistant expert en analyse de salons professionnels et d'événements B2B.
Tu as accès aux données de ${count} exposants extraites depuis : ${url}

Voici les données complètes des exposants (JSON) :
\`\`\`json
${exhibitorsJSON}
\`\`\`

Tes capacités :
- Répondre aux questions sur les exposants (secteur, localisation, contact, etc.)
- Suggérer des exposants selon des critères métiers ("exposants dans la mode", "entreprises françaises", etc.)
- Comparer des exposants entre eux
- Fournir des résumés, statistiques, ou listes filtrées
- Identifier des tendances dans les catégories représentées

Règles :
- Réponds toujours en français
- Si tu listes des exposants, formate avec leur nom, stand, et une courte description
- Si une info est absente (null), dis-le clairement plutôt qu'inventer
- Sois concis mais complet
- Tu peux donner des recommandations basées sur les données`;
}

function safeJSON(str) {
  try { return JSON.parse(str); } catch { return []; }
}

module.exports = { chat };
