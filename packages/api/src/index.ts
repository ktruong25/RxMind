import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { errorHandler } from './middleware/error';
import { startCron } from './services/cron';

import authRoutes from './routes/auth';
import inventoryRoutes from './routes/inventory';
import productRoutes from './routes/products';
import pullRoutes from './routes/pulls';
import alertRoutes from './routes/alerts';
import patientRoutes from './routes/patients';
import claimRoutes from './routes/claims';
import mtmRoutes from './routes/mtm';

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use('/auth', authRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/products', productRoutes);
app.use('/pulls', pullRoutes);
app.use('/alerts', alertRoutes);
app.use('/patients', patientRoutes);
app.use('/claims', claimRoutes);
app.use('/mtm', mtmRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[api] listening on port ${PORT}`);
  startCron();
});

export default app;
