const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const Staff = require('../models/Staff');
const { generateToken } = require('../middleware/auth');

class AuthController {
  // Register new staff member
  static async register(req, res) {
    try {
      console.log('Registration request body:', req.body);
      console.log('Registration request headers:', req.headers);
      
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, name, email, phoneNumber, role, password } = req.body;

      // Check if user already exists
      const existingStaff = await Staff.getByEmail(email);
      if (existingStaff) {
        return res.status(400).json({ error: 'Staff member with this email already exists' });
      }

      // Validate staff data
      const validation = Staff.validate({ username, name, email, phoneNumber, role });
      if (!validation.isValid) {
        return res.status(400).json({ errors: validation.errors });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create staff member
      const staffData = {
        username,
        name,
        email,
        phoneNumber,
        role: role || 'heartSmiles',
        password: hashedPassword,
        isActive: true
      };

      const staff = await Staff.create(staffData);

      // Generate token
      const token = generateToken(staff.id, staff.role);

      // Remove password from response
      const { password: _, ...staffResponse } = staff;

      res.status(201).json({
        message: 'Staff member registered successfully',
        staff: staffResponse,
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Login staff member
  static async login(req, res) {
    try {
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find staff member by email
      const staff = await Staff.getByEmail(email);
      if (!staff) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if staff is active (default to true if not set for backward compatibility)
      if (staff.isActive === false) {
        return res.status(401).json({ error: 'Account is deactivated' });
      }

      // Verify password
      if (!staff.password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, staff.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = generateToken(staff.id, staff.role);

      // Remove password from response
      const { password: _, ...staffResponse } = staff;

      res.json({
        message: 'Login successful',
        staff: staffResponse,
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get current user profile
  static async getProfile(req, res) {
    try {
      // Remove password from response
      const { password: _, ...staffResponse } = req.user;
      res.json({ staff: staffResponse });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Update profile
  static async updateProfile(req, res) {
    try {
      const { name, phoneNumber, profilePictureUrl } = req.body;
      const userId = req.user.id;

      const updateData = {};
      if (name) updateData.name = name;
      if (phoneNumber) updateData.phoneNumber = phoneNumber;
      if (profilePictureUrl) updateData.profilePictureUrl = profilePictureUrl;

      const updatedStaff = await Staff.update(userId, updateData);

      // Remove password from response
      const { password: _, ...staffResponse } = updatedStaff;

      res.json({
        message: 'Profile updated successfully',
        staff: staffResponse
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Change password
  static async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Get current staff member with password
      const staff = await Staff.getById(userId);
      if (!staff.password) {
        return res.status(400).json({ error: 'No password set for this account' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, staff.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await Staff.update(userId, { password: hashedNewPassword });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Validation rules for registration
  static getRegisterValidation() {
    return [
      body('username')
        .isLength({ min: 3 })
        .withMessage('Username must be at least 3 characters long')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
      body('name')
        .isLength({ min: 2 })
        .withMessage('Name must be at least 2 characters long'),
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
      body('phoneNumber')
        .optional()
        .isMobilePhone()
        .withMessage('Valid phone number is required'),
      body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
      body('role')
        .optional()
        .isIn(['heartSmiles', 'umd'])
        .withMessage('Role must be either "heartSmiles" or "umd"')
    ];
  }

  // Validation rules for login
  static getLoginValidation() {
    return [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
      body('password')
        .notEmpty()
        .withMessage('Password is required')
    ];
  }

  // Validation rules for password change
  static getChangePasswordValidation() {
    return [
      body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
      body('newPassword')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
    ];
  }
}

module.exports = AuthController;
