const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('ERROR: Missing required environment variables:', missingEnvVars);
  // Don't crash - let the app start but authentication will fail with clear errors
}

try {
  require('../config/firebase');
} catch (error) {
  console.error('Firebase initialization error:', error);
}

const authRoutes = require('../routes/auth');
const participantRoutes = require('../routes/participants');
const programRoutes = require('../routes/programs');
const staffRoutes = require('../routes/staff');
const uploadRoutes = require('../routes/upload');
const exportRoutes = require('../routes/export');
const importRoutes = require('../routes/import');

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health',
  validate: { trustProxy: false }
});
app.use(limiter);

// -- CORS SETUP with LOGGING --
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:3003',
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null,
  'https://heart-smiles-frontend-deployment-2mkr2p0k8-sara-devis-projects.vercel.app',
  'https://heart-smiles-frontend.vercel.app',
  /^https:\/\/heart-smiles-frontend.*\.vercel\.app$/,
].filter(Boolean);

console.log('CORS allowed origins:', allowedOrigins);

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  return allowedOrigins.some(allowed => {
    if (typeof allowed === 'string') return allowed === origin;
    if (allowed instanceof RegExp) return allowed.test(origin);
    return false;
  });
};

app.use(cors({
  origin: (origin, callback) => {
    console.log('[CORS DEBUG]', origin);
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn('[CORS BLOCKED]', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin',
    'Access-Control-Request-Method', 'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  optionsSuccessStatus: 204
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug logging only
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${req.originalUrl}`);
  next();
});

// Root test route for '/api' (optional)
app.get('/api', (req, res) => {
  res.status(200).json({ message: 'Welcome to HeartSmiles Backend API.' });
});

app.get('/', (req, res) => {
  res.status(200).json({ name: 'HeartSmiles Backend API', version: '1.0.0', status: 'OK' });
});

// Mount routes on /api only (the Vercel way)
app.use('/api/auth', authRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/import', importRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'HeartSmiles Backend API is running', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error stack:', err.stack);
  res.status(err.status || 500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// Boilerplate for process stuff
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  if (process.env.NODE_ENV !== 'production') process.exit(1);
});

module.exports = app;
module.exports.default = app;

if (process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
  app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
    console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
  });
}