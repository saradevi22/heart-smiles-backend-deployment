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
try {
  require('./config/firebase');
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Don't crash - let the app start and handle errors in route handlers
}

// Import routes
const authRoutes = require('./routes/auth');
const participantRoutes = require('./routes/participants');
const programRoutes = require('./routes/programs');
const staffRoutes = require('./routes/staff');
const uploadRoutes = require('./routes/upload');
const exportRoutes = require('./routes/export');
const importRoutes = require('./routes/import');

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
  // Deployed frontend URLs
  'https://heart-smiles-frontend-ri7gn79hh-sara-devis-projects.vercel.app',
  'https://heart-smiles-frontend.vercel.app',
  // Allow any Vercel frontend subdomain
  /^https:\/\/heart-smiles-frontend.*\.vercel\.app$/,
  // Allow any vercel.app subdomain (very permissive for Vercel deployments)
  /^https:\/\/.*\.vercel\.app$/,
].filter(Boolean); // Remove null/undefined values

// Configure CORS for production and development
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // In development, allow all origins for easier debugging
      if (process.env.NODE_ENV === 'development') {
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

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    timestamp: new Date().toISOString()
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
app.use('/api/auth', authRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/import', importRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
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
module.exports = app;

// Only listen on port if not in Vercel environment
// Vercel serverless functions don't need app.listen()
if (process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
  app.listen(PORT, () => {
    console.log(`HeartSmiles Backend API running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
  });
}
