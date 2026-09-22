// Vercel deploys this file as a serverless function and routes every
// /api/* request to it (see vercel.json). It simply hands the request to
// the same Express app used for local/traditional hosting.
import app from '../server/src/app.js';

export default app;
