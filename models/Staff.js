const { db, admin } = require('../config/firebase');

class Staff {
  constructor(data) {
    this.username = data.username || '';
    this.name = data.name || '';
    this.phoneNumber = data.phoneNumber || '';
    this.email = data.email || '';
    this.password = data.password || ''; // Store hashed password
    this.profilePictureUrl = data.profilePictureUrl || '';
    this.role = data.role || 'heartSmiles'; // 'heartSmiles' or 'umd'
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Create a new staff member
  static async create(staffData) {
    try {
      const staff = new Staff(staffData);
      const docRef = await db.collection('staff').add({
        ...staff,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return { id: docRef.id, ...staff };
    } catch (error) {
      throw new Error(`Error creating staff member: ${error.message}`);
    }
  }

  // Get staff member by ID
  static async getById(id) {
    try {
      const doc = await db.collection('staff').doc(id).get();
      if (!doc.exists) {
        throw new Error('Staff member not found');
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw new Error(`Error getting staff member: ${error.message}`);
    }
  }

  // Get staff member by email
  static async getByEmail(email) {
    try {
      const snapshot = await db.collection('staff')
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw new Error(`Error getting staff member by email: ${error.message}`);
    }
  }

  // Get all staff members
  static async getAll(filters = {}) {
    try {
      let query = db.collection('staff');
      
      if (filters.role) {
        query = query.where('role', '==', filters.role);
      }
      
      if (filters.isActive !== undefined) {
        query = query.where('isActive', '==', filters.isActive);
      }
      
      const snapshot = await query.get();
      const staff = [];
      snapshot.forEach(doc => {
        staff.push({ id: doc.id, ...doc.data() });
      });
      
      return staff;
    } catch (error) {
      throw new Error(`Error getting staff members: ${error.message}`);
    }
  }

  // Update staff member
  static async update(id, updateData) {
    try {
      const updatePayload = {
        ...updateData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection('staff').doc(id).update(updatePayload);
      return await this.getById(id);
    } catch (error) {
      throw new Error(`Error updating staff member: ${error.message}`);
    }
  }

  // Delete staff member (soft delete)
  static async delete(id) {
    try {
      await db.collection('staff').doc(id).update({
        isActive: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      throw new Error(`Error deleting staff member: ${error.message}`);
    }
  }

  // Validate staff data
  static validate(data) {
    const errors = [];
    
    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push('Valid email is required');
    }
    
    if (!data.name || data.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }
    
    if (!data.username || data.username.trim().length < 3) {
      errors.push('Username must be at least 3 characters long');
    }
    
    if (data.role && !['heartSmiles', 'umd'].includes(data.role)) {
      errors.push('Role must be either "heartSmiles" or "umd"');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Helper method to validate email
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = Staff;
