import express from 'express';
import cors from 'cors';
import { getDb } from './db/database.js';
import gameRouter from './routes/game.js';
import factionRouter from './routes/faction.js';
import provinceRouter from './routes/province.js';
import combatRouter from './routes/combat.js';
import diplomacyRouter from './routes/diplomacy.js';
import intrigueRouter from './routes/intrigue.js';
import recruitRouter from './routes/recruitment.js';
import commanderRouter from './routes/commanders.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

app.use('/api/game', gameRouter);
app.use('/api/faction', factionRouter);
app.use('/api/province', provinceRouter);
app.use('/api/combat', combatRouter);
app.use('/api/diplomacy', diplomacyRouter);
app.use('/api/intrigue', intrigueRouter);
app.use('/api/recruit', recruitRouter);
app.use('/api/commanders', commanderRouter);

app.get('/api/health', (_req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT sqlite_version() as v').get() as { v: string };
  res.json({ status: 'ok', sqlite: row.v });
});

app.listen(PORT, () => {
  console.log(`Pax Imperia API running on http://localhost:${PORT}`);
});

export default app;
