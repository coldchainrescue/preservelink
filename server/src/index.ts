import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { EventEmitter } from 'events';
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
import { authMiddleware } from './middleware/auth.js';

const app = express();

// ── SSE Event Bus ────────────────────────────────────────────────────────────
// sseClients maps userId → Response so we can push events to specific users
// or broadcast to everyone.
const _serverEvents = new EventEmitter();
const sseClients: Map<string, express.Response> = new Map();

export function broadcastEvent(type: string, data: any, targetUserId?: string) {
  const payload = `data: ${JSON.stringify({ type, ...data })}\n\n`;
  if (targetUserId) {
    sseClients.get(targetUserId)?.write(payload);
  } else {
    sseClients.forEach((res) => res.write(payload));
  }
}
// ── End SSE helpers ──────────────────────────────────────────────────────────

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

// ── SSE stream endpoint ──────────────────────────────────────────────────────
// Frontend connects here (once, on login) to receive live push events.
// Token is passed as ?token=<accessToken> because EventSource doesn't support headers.
app.get('/api/events/stream', authMiddleware, (req: any, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const userId: string = req.user.id;
  sseClients.set(userId, res);

  // Keep-alive ping every 25 seconds to prevent proxy timeouts
  const keepAlive = setInterval(() => res.write(': ping\n\n'), 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(userId);
  });
});
// ── End SSE endpoint ─────────────────────────────────────────────────────────

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
  console.log(`\n  ┌────────────────────────────────────────────┐`);
  console.log(`  │  PreserveLink Server                      │`);
  console.log(`  │  Mode: ${env.DEMO_MODE ? 'DEMO (no external APIs needed)' : 'PRODUCTION                   '} │`);
  console.log(`  │  Port: ${env.PORT}                                  │`);
  console.log(`  │  URL:  ${env.SERVER_URL}              │`);
  console.log(`  └────────────────────────────────────────────┘\n`);
  if (env.DEMO_MODE) {
    console.log('  Demo credentials:');
    console.log('  Email: hanisahjohaari@gmail.com');
    console.log('  Password: demo123\n');
  }
});

export default app;
