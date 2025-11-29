const jwt = require('jsonwebtoken');
const Staff = require('../models/Staff');

// Validate JWT_SECRET at module load time
if (!process.env.JWT_SECRET) {
  console.error('WARNING: JWT_SECRET environment variable is not set! Authentication will fail.');
  console.error('Please set JWT_SECRET in your Vercel environment variables.');
}

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is missing - authentication cannot proceed');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'JWT_SECRET is not configured. Please contact the administrator.'
      });
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('Authentication failed: No token provided', {
        path: req.path,
        method: req.method,
        headers: Object.keys(req.headers)
      });
      return res.status(401).json({ error: 'Access token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error('JWT verification error:', {
        name: jwtError.name,
        message: jwtError.message,
        path: req.path,
        hasSecret: !!process.env.JWT_SECRET,
        secretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0
      });
      
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      throw jwtError;
    }

    const staff = await Staff.getById(decoded.userId);

    if (!staff || !staff.isActive) {
      console.log('Authentication failed: Invalid or inactive user', {
        userId: decoded.userId,
        staffExists: !!staff,
        isActive: staff?.isActive
      });
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    req.user = staff;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      path: req.path
    });
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Middleware to check if user is HeartSmiles staff (has full access)
const requireHeartSmilesStaff = (req, res, next) => {
  if (req.user.role !== 'heartSmiles') {
    return res.status(403).json({ error: 'HeartSmiles staff access required' });
  }
  next();
};

// Middleware to check if user is UMD staff (read-only access)
const requireUMDStaff = (req, res, next) => {
  if (req.user.role !== 'umd') {
    return res.status(403).json({ error: 'UMD staff access required' });
  }
  next();
};

// Middleware to allow both HeartSmiles and UMD staff
const requireStaffAccess = (req, res, next) => {
  if (!['heartSmiles', 'umd'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Staff access required' });
  }
  next();
};

// Middleware for read-only access (UMD staff can only read)
const requireReadOnlyAccess = (req, res, next) => {
  if (req.user.role === 'umd' && req.method !== 'GET') {
    return res.status(403).json({ error: 'UMD staff have read-only access' });
  }
  next();
};

// Generate JWT token
const generateToken = (userId, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured. Cannot generate token.');
  }
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

module.exports = {
  authenticateToken,
  requireHeartSmilesStaff,
  requireUMDStaff,
  requireStaffAccess,
  requireReadOnlyAccess,
  generateToken
};
