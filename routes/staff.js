const express = require('express');
const Staff = require('../models/Staff');
const { authenticateToken, requireHeartSmilesStaff } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all staff members (only HeartSmiles staff can view)
router.get('/', 
  requireHeartSmilesStaff,
  async (req, res) => {
    try {
      const { role, isActive } = req.query;
      const filters = {};
      
      if (role) filters.role = role;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      
      const staff = await Staff.getAll(filters);
      
      // Remove passwords from response
      const staffResponse = staff.map(member => {
        const { password, ...memberWithoutPassword } = member;
        return memberWithoutPassword;
      });
      
      res.json({ staff: staffResponse });
    } catch (error) {
      console.error('Get staff error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get staff member by ID (only HeartSmiles staff can view)
router.get('/:id', 
  requireHeartSmilesStaff,
  async (req, res) => {
    try {
      const { id } = req.params;
      const staff = await Staff.getById(id);
      
      // Remove password from response
      const { password, ...staffResponse } = staff;
      
      res.json({ staff: staffResponse });
    } catch (error) {
      console.error('Get staff member error:', error);
      if (error.message === 'Staff member not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }
);

// Update staff member (only HeartSmiles staff can update)
router.put('/:id', 
  requireHeartSmilesStaff,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Don't allow updating password through this endpoint
      delete updateData.password;
      
      const staff = await Staff.update(id, updateData);
      
      // Remove password from response
      const { password, ...staffResponse } = staff;
      
      res.json({
        message: 'Staff member updated successfully',
        staff: staffResponse
      });
    } catch (error) {
      console.error('Update staff member error:', error);
      if (error.message === 'Staff member not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }
);

// Deactivate staff member (only HeartSmiles staff can deactivate)
router.delete('/:id', 
  requireHeartSmilesStaff,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Prevent self-deletion
      if (id === req.user.id) {
        return res.status(400).json({ error: 'Cannot deactivate your own account' });
      }
      
      await Staff.delete(id);
      res.json({ message: 'Staff member deactivated successfully' });
    } catch (error) {
      console.error('Delete staff member error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
