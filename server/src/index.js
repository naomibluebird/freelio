import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { app } from './app.js';

const PORT = process.env.PORT || 5000;

// Serve the built React app in production (traditional Node hosting, e.g.
// Railway/Render). On Vercel the static build is served separately and
// this branch is never hit because that platform imports ./app.js directly.
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(dist)) {
  const express = (await import('express')).default;
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => console.log(`Freelio API running on http://localhost:${PORT}`));
