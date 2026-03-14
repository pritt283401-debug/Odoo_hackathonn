import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { testConnection } from './db/connection';

import authRouter       from './routes/auth';
import productsRouter   from './routes/products';
import categoriesRouter from './routes/categories';
import warehousesRouter from './routes/warehouses';
import operationsRouter from './routes/operations';
import dashboardRouter  from './routes/dashboard';
import ledgerRouter     from './routes/ledger';

dotenv.config();

const app  = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRouter);
app.use('/api/products',    productsRouter);
app.use('/api/categories',  categoriesRouter);
app.use('/api/warehouses',  warehousesRouter);
app.use('/api/operations',  operationsRouter);
app.use('/api/dashboard',   dashboardRouter);
app.use('/api/ledger',      ledgerRouter);

// 404
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status  = err.status  || 500;
  const message = err.message || 'Internal server error';
  console.error(`[ERROR] ${status}: ${message}`, err.stack || '');
  res.status(status).json({ success: false, message });
});

export { app }; // ─── Export for testing

// ─── Start ────────────────────────────────────────────────────────────────────
async function main() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀 CoreInventory API running at http://localhost:${PORT}`);
    console.log(`   Frontend expected at ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  });
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal startup error:', err);
    process.exit(1);
  });
}
