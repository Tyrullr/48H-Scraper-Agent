const knex = require('knex');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './data/exhibitors.db';

// Créer le dossier data si nécessaire
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = knex({
  client: 'sqlite3',
  connection: { filename: DB_PATH },
  useNullAsDefault: true,
  pool: { min: 1, max: 1 }
});

// Création des tables au démarrage
async function initDB() {
  const hasSessions = await db.schema.hasTable('sessions');
  if (!hasSessions) {
    await db.schema.createTable('sessions', t => {
      t.string('id').primary();
      t.string('url').notNullable();
      t.string('status').notNullable().defaultTo('pending');
      t.string('created_at').defaultTo(db.fn.now());
      t.string('updated_at').defaultTo(db.fn.now());
      t.text('error');
    });
  }

  const hasExhibitors = await db.schema.hasTable('exhibitors');
  if (!hasExhibitors) {
    await db.schema.createTable('exhibitors', t => {
      t.string('id').primary();
      t.string('session_id').notNullable();
      t.string('name');
      t.text('description');
      t.string('website');
      t.string('logo');
      t.string('stand');
      t.string('country');
      t.string('linkedin');
      t.string('twitter');
      t.text('categories');
      t.string('email');
      t.string('phone');
      t.text('raw_data');
      t.string('created_at').defaultTo(db.fn.now());
      t.index('session_id');
    });
  }

  const hasChat = await db.schema.hasTable('chat_messages');
  if (!hasChat) {
    await db.schema.createTable('chat_messages', t => {
      t.increments('id').primary();
      t.string('session_id').notNullable();
      t.string('role').notNullable();
      t.text('content').notNullable();
      t.string('created_at').defaultTo(db.fn.now());
      t.index('session_id');
    });
  }

  console.log('✅ Base de données initialisée');
}

module.exports = { db, initDB };
