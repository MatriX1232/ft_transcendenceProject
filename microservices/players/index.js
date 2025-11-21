import Fastify from 'fastify';
import cors from '@fastify/cors';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const fastify = Fastify({ logger: true });
const PORT = process.env.PORT || 3101;

// Initialize SQLite database
const dbPath = '/app/database/players.db';
const dbDir = path.dirname(dbPath);

// Ensure directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alias TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert some default players if table is empty
const count = db.prepare('SELECT COUNT(*) as count FROM players').get();
if (count.count === 0) {
  const insert = db.prepare('INSERT INTO players (alias) VALUES (?)');
  insert.run('player1');
  insert.run('player2'); 
  insert.run('test-user');
}

// Register CORS
await fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS']
});

// Health check
fastify.get('/health', async (_, reply) => {
  reply.send({ 
    status: 'ok', 
    service: 'players', 
    port: PORT 
  });
});

// Get players
fastify.get('/players', async (_, reply) => {
  try {
    const players = db.prepare('SELECT alias FROM players ORDER BY alias ASC').all();
    reply.send(players.map(p => p.alias));
  } catch (error) {
    fastify.log.error(error);
    reply.code(500).send({ error: 'Database error' });
  }
});

// Add player
fastify.post('/players', async (request, reply) => {
  const { alias } = request.body;
  if (!alias) return reply.code(400).send({ error: 'Alias required' });
  
  try {
    db.prepare('INSERT INTO players (alias) VALUES (?)').run(alias.trim());
    reply.code(201).send({ message: 'Player added' });
  } catch (err) {
    reply.code(err.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 409 : 500).send({ error: 'Alias exists or error' });
  }
});

// Delete all players
fastify.delete('/players', async (_, reply) => {
  try {
    db.prepare('DELETE FROM players').run();
    reply.send({ message: 'All players deleted' });
  } catch (error) {
    fastify.log.error(error);
    reply.code(500).send({ error: 'Database error' });
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();