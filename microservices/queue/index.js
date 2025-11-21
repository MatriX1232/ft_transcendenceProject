import Fastify from 'fastify';
import cors from '@fastify/cors';
import db from '../../database/tables/queue.db';

const fastify = Fastify({ logger: true });
fastify.register(cors);

const PORT = 3103;

//geet queue
fastify.get('/queue', async (_, reply) => {
  const rows = db.prepare('SELECT alias FROM queue ORDER BY id ASC').all();
  reply.send(rows.map(r => r.alias));
});

//post queue
fastify.post('/queue', async (request, reply) => {
  const { queue } = request.body;
  if (!Array.isArray(queue))
    return reply.code(400).send({ error: 'Queue must be array of aliases' });

  try {
    const trx = db.transaction(() => {
      db.prepare('DELETE FROM queue').run();
      const insert = db.prepare('INSERT INTO queue (alias) VALUES (?)');
      queue.forEach(alias => insert.run(alias));
    });

    trx();
    reply.send({ message: 'Queue updated' });
  } catch {
    reply.code(500).send({ error: 'Failed to update queue' });
  }
});

fastify.listen({ port: PORT }, () => {
});
