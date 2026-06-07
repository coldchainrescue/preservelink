import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { RATE_LIMITS } from './config/constants.js';
import { UPLOADS_DIR } from './paths.js';
import { authRoutes } from './routes/auth.js';
import { searchRoutes } from './routes/search.js';
import { contributionRoutes } from './routes/contributions.js';
import { adminRoutes } from './routes/admin.js';
import { cmsRoutes } from './routes/cms.js';
import { notificationRoutes } from './routes/notifications.js';
import { analyticsRoutes } from './routes/analytics.js';

const app = express();

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const generalLimiter = rateLimit(RATE_LIMITS.GENERAL);
app.use('/api/', generalLimiter);

// Static files (uploads)
app.use('/uploads', express.static(UPLOADS_DIR));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    mode: env.DEMO_MODE ? 'demo' : 'production',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(env.DEMO_MODE && { stack: err.stack }),
  });
});

app.listen(env.PORT, () => {
  console.log(`\n  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510`);
  console.log(`  \u2502  PreserveLink Server                      \u2502`);
  console.log(`  \u2502  Mode: ${env.DEMO_MODE ? 'DEMO (no external APIs needed)' : 'PRODUCTION                   '} \u2502`);
  console.log(`  \u2502  Port: ${env.PORT}                                  \u2502`);
  console.log(`  \u2502  URL:  ${env.SERVER_URL}              \u2502`);
  console.log(`  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n`);
  if (env.DEMO_MODE) {
    console.log('  Demo credentials:');
    console.log('  Email: hanisahjohaari@gmail.com');
    console.log('  Password: demo123\n');
  }
});

export default app;
