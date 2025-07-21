import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { settings } from './config/database.js';

import authRoutes from './routes/auth.js';
import revendasRoutes from './routes/revendas.js';
import adminsRoutes from './routes/admins.js';
import logsRoutes from './routes/logs.js';
import dashboardRoutes from './routes/dashboard.js';
import profilesRoutes from './routes/profiles.js';
import serversRoutes from './routes/servers.js';
import configRoutes from './routes/config.js';
import plansRoutes from './routes/plans.js';
import streamingsRoutes from './routes/streamings.js';

const app = express();

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (settings.CORS_ORIGIN.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/revendas', revendasRoutes);
app.use('/api/admins', adminsRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/servers', serversRoutes);
app.use('/api/config', configRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/streamings', streamingsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erro interno do servidor' });
});

app.use('*', (req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' });
});

const PORT = settings.PORT;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/api/health`);
});

export default app;
