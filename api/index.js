const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Validate critical environment variables at startup
const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('ERROR: Missing required environment variables:', missingEnvVars);
  console.error('Please set these in your Vercel project settings:');
  missingEnvVars.forEach(varName => {
    console.error(`  - ${varName}`);
  });
  // Don't crash - let the app start but authentication will fail with clear errors
}

// Initialize Firebase early to catch initialization errors
try {
  require('../config/firebase');
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Don't crash - let the app start and handle errors in route handlers
}

// Import routes
const authRoutes = require('../routes/auth');
const participantRoutes = require('../routes/participants');
const programRoutes = require('../routes/programs');
const staffRoutes = require('../routes/staff');
const uploadRoutes = require('../routes/upload');
const exportRoutes = require('../routes/export');
const importRoutes = require('../routes/import');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - REQUIRED for Vercel and other reverse proxies
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Rate limiting - apply to all routes except health check
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health',
  validate: {
    trustProxy: false
  }
});
app.use(limiter);

// -----------------------------
// CORS configuration
// -----------------------------
const allowedOrigins = [
  // Local development URLs
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:3003',
  // Production frontend URL (set in Vercel project env vars)
  process.env.FRONTEND_URL,
  // Vercel frontend URLs and subdomains
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null,
  // Deployed and preview frontend URLs (add all project URLs)
  'https://heart-smiles-frontend-deployment-2mkr2p0k8-sara-devis-projects.vercel.app',
  'https://heart-smiles-frontend.vercel.app',
  // RegExp for ANY vercel.app subdomain for this project (useful for Vercel previews)
  /^https:\/\/heart-smiles-frontend.*\.vercel\.app$/,
].filter(Boolean); // Remove null/undefined

console.log('CORS allowed origins:', allowedOrigins);

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow requests with no origin (curl, Postman)
  return allowedOrigins.some(allowed => {
    if (typeof allowed === 'string') return allowed === origin;
    if (allowed instanceof RegExp) return allowed.test(origin);
    return false;
  });
};

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn('CORS: Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Only true if you need to send cookies/sessions
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  optionsSuccessStatus: 204
}));

// Note: the above cors() middleware handles OPTIONS by default

// -----------------------------

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug middleware - log all incoming requests and fix path if needed
app.use((req, res, next) => {
  const originalPath = req.path;
  const originalUrl = req.originalUrl;
  console.log(`[${new Date().toISOString()}] ${req.method}`, {
    path: req.path,
    originalUrl: req.originalUrl,
    url: req.url,
    baseUrl: req.baseUrl,
    query: req.query
  });
  if (originalUrl.startsWith('/api/') && !req.path.startsWith('/api/')) {
    console.log('Fixing path: adding /api prefix');
    req.url = '/api' + req.path + (req.url.includes('?') ? req.url.substring(req.path.length) : '');
    req.originalUrl = '/api' + req.originalUrl;
  }
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'HeartSmiles Backend API',
    version: '1.0.0',
    status: 'OK',
    message: 'HeartSmiles Youth Success App Backend API',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      participants: '/api/participants',
      programs: '/api/programs',
      staff: '/api/staff',
      upload: '/api/upload',
      export: '/api/export',
      import: '/api/import'
    },
    timestamp: new Date().toISOString(),
    debug: {
      path: req.path,
      originalUrl: req.originalUrl,
      url: req.url,
      baseUrl: req.baseUrl,
      method: req.method
    },
    note: 'If you see this, the Express app is running. Test /api/test or /test to see routing.'
  });
});

// Test endpoint to verify routing works
app.get('/test', (req, res) => {
  res.status(200).json({
    message: 'Test endpoint works!',
    path: req.path,
    originalUrl: req.originalUrl,
    url: req.url,
    baseUrl: req.baseUrl
  });
});

app.get('/api/test', (req, res) => {
  res.status(200).json({
    message: 'API test endpoint works!',
    path: req.path,
    originalUrl: req.originalUrl,
    url: req.url,
    baseUrl: req.baseUrl
  });
});

// Handle favicon requests
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});
app.get('/favicon.png', (req, res) => {
  res.status(204).end();
});

// Mount all routes with /api prefix and without (to handle Vercel/no Vercel)
app.use('/api/auth', authRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/import', importRoutes);
app.use('/auth', authRoutes);
app.use('/participants', participantRoutes);
app.use('/programs', programRoutes);
app.use('/staff', staffRoutes);
app.use('/upload', uploadRoutes);
app.use('/export', exportRoutes);
app.use('/import', importRoutes);

// Health check endpoints
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'HeartSmiles Backend API is running',
    timestamp: new Date().toISOString()
  });
});
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'HeartSmiles Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error stack:', err.stack);
  console.error('Error details:', {
    message: err.message,
    name: err.name,
    path: req.path,
    method: req.method
  });
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    error: 'Something went wrong!',
    message: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  const debugInfo = {
    path: req.path,
    originalUrl: req.originalUrl,
    url: req.url,
    baseUrl: req.baseUrl,
    method: req.method,
    route: req.route ? req.route.path : 'no route matched',
    params: req.params,
    query: req.query,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      'host': req.headers['host']
    }
  };
  console.log('404 - Route not found:', JSON.stringify(debugInfo, null, 2));
  res.status(404).json({
    error: 'Route not found',
    debug: debugInfo,
    availableRoutes: [
      'GET /',
      'GET /test',
      'GET /api/test',
      'GET /api/health',
      'GET /health',
      'POST /api/auth/login',
      'POST /auth/login'
    ],
    note: 'Check the debug object to see what path Express received'
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Export the app for Vercel serverless functions
module.exports = app;
module.exports.default = app;

// Only listen on port if not in Vercel environment
if (process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
  app.listen(PORT, () => {
    console.log(`HeartSmiles Backend API running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
  });
}