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
// This must happen before importing routes that depend on Firebase
// Note: Paths are relative to api/ directory, so we go up one level
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
// Trust only the first proxy (Vercel's edge) - more secure than trusting all proxies
// This allows Express to correctly identify client IPs from X-Forwarded-For headers
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Rate limiting - apply to all routes except health check
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for health check
  skip: (req) => req.path === '/api/health',
  // Skip trust proxy validation since we're behind Vercel's trusted proxy
  validate: {
    trustProxy: false
  }
});
app.use(limiter);

// CORS configuration - supports both local development and Vercel deployment
// Add your frontend URLs here (both local and production)
/*
const allowedOrigins = [
  // Local development URLs
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:3003',
  // Production frontend URL (set via FRONTEND_URL environment variable in Vercel)
  process.env.FRONTEND_URL,
  // Vercel frontend URLs (automatically detected if using Vercel)
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null,
  // Deployed frontend URLs - add all possible frontend URLs
  'https://heart-smiles-frontend-ri7gn79hh-sara-devis-projects.vercel.app',
  'https://heart-smiles-frontend-gtl422eh0-sara-devis-projects.vercel.app',
  'https://heart-smiles-frontend.vercel.app',
  // Allow any Vercel frontend subdomain (for flexibility)
  /^https:\/\/heart-smiles-frontend.*\.vercel\.app$/,
  // Allow any vercel.app subdomain (very permissive for Vercel deployments)
  /^https:\/\/.*\.vercel\.app$/,
].filter(Boolean); // Remove null/undefined values

console.log('CORS allowed origins:', allowedOrigins);

// Helper function to check if origin is allowed
const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow requests with no origin
  
  return allowedOrigins.some(allowed => {
    if (typeof allowed === 'string') {
      return allowed === origin;
    } else if (allowed instanceof RegExp) {
      return allowed.test(origin);
    }
    return false;
  });
};
*/

// Configure CORS for production
app.use(cors({
  origin: ['http://localhost:3002', 'https://heart-smiles-frontend.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle OPTIONS preflight requests FIRST (before CORS middleware)
// This ensures preflight requests always get proper headers
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  console.log('OPTIONS preflight request:', req.path, 'from origin:', origin);
  
  // Check if origin should be allowed
  const isAllowed = isOriginAllowed(origin) || process.env.NODE_ENV === 'development';
  
  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    console.log('OPTIONS preflight: Allowed origin:', origin);
    res.status(204).end();
  } else {
    console.warn('OPTIONS preflight: Blocked origin:', origin);
    res.status(403).json({ error: 'CORS preflight blocked' });
  }
});
/*
// Configure CORS for production and development (for actual requests)
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    console.log('CORS: Checking origin:', origin);
    
    // Check if origin is in allowed list
    const isAllowed = isOriginAllowed(origin);
    
    if (isAllowed) {
      console.log('CORS: Allowing origin:', origin);
      callback(null, true);
    } else {
      console.warn('CORS: Blocked origin:', origin);
      console.warn('CORS: Allowed origins:', allowedOrigins);
      // In development, allow all origins for easier debugging
      if (process.env.NODE_ENV === 'development') {
        console.warn('CORS: Development mode - allowing origin anyway');
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
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
  maxAge: 86400, // 24 hours - cache preflight requests
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
*/

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
  
  // Vercel might be passing paths without /api prefix when routing /api/(.*)
  // If the path doesn't start with /api but the originalUrl does, fix it
  if (originalUrl.startsWith('/api/') && !req.path.startsWith('/api/')) {
    console.log('Fixing path: adding /api prefix');
    req.url = '/api' + req.path + (req.url.includes('?') ? req.url.substring(req.path.length) : '');
    req.originalUrl = '/api' + req.originalUrl;
  }
  
  next();
});

// Root endpoint - provides API information
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

// Handle favicon requests (browsers automatically request these)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No Content
});

app.get('/favicon.png', (req, res) => {
  res.status(204).end(); // No Content
});

// Routes
// Mount routes with /api prefix (works for both local and Vercel)
console.log('Mounting routes...');
console.log('Auth routes type:', typeof authRoutes);
console.log('Auth routes:', authRoutes);

try {
  // Mount with /api prefix
  app.use('/api/auth', authRoutes);
  app.use('/api/participants', participantRoutes);
  app.use('/api/programs', programRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/export', exportRoutes);
  app.use('/api/import', importRoutes);
  console.log('Routes with /api prefix mounted successfully');

  // Also mount routes without /api prefix as fallback (in case Vercel strips it)
  // This ensures routes work regardless of how Vercel routes the request
  app.use('/auth', authRoutes);
  app.use('/participants', participantRoutes);
  app.use('/programs', programRoutes);
  app.use('/staff', staffRoutes);
  app.use('/upload', uploadRoutes);
  app.use('/export', exportRoutes);
  app.use('/import', importRoutes);
  console.log('Routes without /api prefix mounted successfully');
  
  // Log all registered routes for debugging
  console.log('Registered routes:');
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      console.log(`  ${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      console.log(`  Router mounted at: ${middleware.regexp}`);
    }
  });
  
  console.log('All routes mounted. App ready to handle requests.');
} catch (error) {
  console.error('Error mounting routes:', error);
  console.error('Error stack:', error.stack);
  throw error;
}

// Health check endpoints (with and without /api prefix)
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

// Error handling middleware - MUST be after all routes
app.use((err, req, res, next) => {
  console.error('Error stack:', err.stack);
  console.error('Error details:', {
    message: err.message,
    name: err.name,
    path: req.path,
    method: req.method
  });
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({ 
    error: 'Something went wrong!',
    message: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler - includes debug info to help diagnose routing issues
// This MUST be the last route handler
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

// Handle unhandled promise rejections (critical for serverless)
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in serverless - let Vercel handle it
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // In serverless, we should let Vercel restart the function
  // In local dev, we might want to exit
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Export the app for Vercel serverless functions
// Vercel's @vercel/node builder automatically wraps this Express app
// Export as both default and named export for compatibility
module.exports = app;
module.exports.default = app;

// Only listen on port if not in Vercel environment
// Vercel serverless functions don't need app.listen()
if (process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
  app.listen(PORT, () => {
    console.log(`HeartSmiles Backend API running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
  });
}
