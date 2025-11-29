const express = require('express');
const AuthController = require('../controllers/authController');
const { authenticateToken, requireHeartSmilesStaff} = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', 
  AuthController.getRegisterValidation(),
  AuthController.register
);

router.post('/login', 
  AuthController.getLoginValidation(),
  AuthController.login
);

// Protected routes
router.get('/profile', 
  authenticateToken,
  AuthController.getProfile
);

router.put('/profile', 
  authenticateToken,
  AuthController.updateProfile
);

router.put('/change-password', 
  authenticateToken,
  AuthController.getChangePasswordValidation(),
  AuthController.changePassword
);

// Admin route for creating UMD staff (only HeartSmiles staff can create UMD staff)
router.post('/register-umd', 
  authenticateToken,
  requireHeartSmilesStaff,
  AuthController.getRegisterValidation(),
  (req, res, next) => {
    // Force role to UMD for this endpoint
    req.body.role = 'umd';
    next();
  },
  AuthController.register
);

module.exports = router;
