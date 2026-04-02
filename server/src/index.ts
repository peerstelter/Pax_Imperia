import express from 'express';
import cors from 'cors';
import gameRouter from './routes/game.js';
import factionRouter from './routes/faction.js';
import provinceRouter from './routes/province.js';
import combatRouter from './routes/combat.js';
import diplomacyRouter from './routes/diplomacy.js';
import intrigueRouter from './routes/intrigue.js';

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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Pax Imperia API running on http://localhost:${PORT}`);
});

export default app;
