import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLevelById, LEVELS } from './src/engine/levels.ts';
import { verifySolutionReplay } from './src/engine/sokoban.ts';
import type { Direction } from './src/engine/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'boxbound-server' });
  });

  app.get('/api/levels', (_req, res) => {
    res.json({ levels: LEVELS });
  });

  app.post('/api/validate-solution', (req, res) => {
    const { levelId, moveSequence } = req.body as {
      levelId?: unknown;
      moveSequence?: unknown;
    };

    if (typeof levelId !== 'number' || !Number.isInteger(levelId) || levelId < 1 || levelId > LEVELS.length) {
      return res.status(400).json({ valid: false, reason: 'Invalid levelId.' });
    }

    if (!Array.isArray(moveSequence)) {
      return res.status(400).json({ valid: false, reason: 'moveSequence must be an array.' });
    }

    const level = getLevelById(levelId);
    const result = verifySolutionReplay(level, moveSequence as Direction[]);

    if (!result.valid) {
      return res.status(422).json({
        valid: false,
        levelId,
        moves: result.moves,
        pushes: result.pushes,
        reason: result.reason,
      });
    }

    return res.json({
      valid: true,
      levelId,
      moves: result.moves,
      pushes: result.pushes,
      optimalMoves: level.optimalMoves,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BOXBOUND server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
