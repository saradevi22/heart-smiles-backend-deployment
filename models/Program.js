const { db, admin } = require('../config/firebase');

class Program {
  constructor(data) {
    this.name = data.name || '';
    this.description = data.description || '';
    this.participants = data.participants || []; // Array of participant IDs
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Create a new program
  static async create(programData) {
    try {
      const program = new Program(programData);
      const docRef = await db.collection('programs').add({
        ...program,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return { id: docRef.id, ...program };
    } catch (error) {
      throw new Error(`Error creating program: ${error.message}`);
    }
  }

  // Get program by ID
  static async getById(id) {
    try {
      const doc = await db.collection('programs').doc(id).get();
      if (!doc.exists) {
        throw new Error('Program not found');
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw new Error(`Error getting program: ${error.message}`);
    }
  }

  // Get program by name
  static async getByName(name) {
    try {
      const snapshot = await db.collection('programs')
        .where('name', '==', name)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        throw new Error('Program not found');
      }
      
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw new Error(`Error getting program: ${error.message}`);
    }
  }

  // Get all programs with optional filters
  static async getAll(filters = {}) {
    try {
      let query = db.collection('programs');
      
      if (filters.isActive !== undefined) {
        query = query.where('isActive', '==', filters.isActive);
      }
      
      const snapshot = await query.get();
      const programs = [];
      snapshot.forEach(doc => {
        programs.push({ id: doc.id, ...doc.data() });
      });
      
      return programs;
    } catch (error) {
      throw new Error(`Error getting programs: ${error.message}`);
    }
  }

  // Search programs by name
  static async search(searchTerm) {
    try {
      const programs = await this.getAll();
      return programs.filter(program => 
        program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        program.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      throw new Error(`Error searching programs: ${error.message}`);
    }
  }

  // Update program
  static async update(id, updateData) {
    try {
      const updatePayload = {
        ...updateData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection('programs').doc(id).update(updatePayload);
      return await this.getById(id);
    } catch (error) {
      throw new Error(`Error updating program: ${error.message}`);
    }
  }

  // Add participant to program
  static async addParticipant(programId, participantId) {
    try {
      const program = await this.getById(programId);
      if (!program.participants.includes(participantId)) {
        await db.collection('programs').doc(programId).update({
          participants: admin.firestore.FieldValue.arrayUnion(participantId),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      return await this.getById(programId);
    } catch (error) {
      throw new Error(`Error adding participant to program: ${error.message}`);
    }
  }

  // Remove participant from program
  static async removeParticipant(programId, participantId) {
    try {
      await db.collection('programs').doc(programId).update({
        participants: admin.firestore.FieldValue.arrayRemove(participantId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return await this.getById(programId);
    } catch (error) {
      throw new Error(`Error removing participant from program: ${error.message}`);
    }
  }

  // Get program with participant details
  static async getWithParticipants(id) {
    try {
      const program = await this.getById(id);
      
      // Get participant details for each participant ID
      const participantPromises = program.participants.map(participantId => 
        db.collection('participants').doc(participantId).get()
      );
      
      const participantSnapshots = await Promise.all(participantPromises);
      const participantDetails = participantSnapshots
        .filter(snapshot => snapshot.exists)
        .map(snapshot => ({ id: snapshot.id, ...snapshot.data() }));
      
      return {
        ...program,
        participantDetails
      };
    } catch (error) {
      throw new Error(`Error getting program with participants: ${error.message}`);
    }
  }

  // Delete program (soft delete)
  static async delete(id) {
    try {
      await db.collection('programs').doc(id).update({
        isActive: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      throw new Error(`Error deleting program: ${error.message}`);
    }
  }

  // Validate program data
  static validate(data) {
    const errors = [];
    
    if (!data.name || data.name.trim().length < 2) {
      errors.push('Program name is required and must be at least 2 characters long');
    }
    
    // Description is optional, but if provided, must be at least 2 characters
    if (data.description && data.description.trim().length < 2) {
      errors.push('Program description must be at least 2 characters long if provided');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get program statistics
  static async getStats(id) {
    try {
      const program = await this.getById(id);
      return {
        totalParticipants: program.participants.length,
        activeParticipants: program.participants.length, // Assuming all participants in programs are active
        programCreated: program.createdAt
      };
    } catch (error) {
      throw new Error(`Error getting program stats: ${error.message}`);
    }
  }
}

module.exports = Program;
