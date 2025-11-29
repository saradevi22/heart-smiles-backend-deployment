const { db, admin } = require('../config/firebase');

class Participant {
  constructor(data) {
    this.name = data.name || '';
    this.dateOfBirth = data.dateOfBirth || '';
    this.address = data.address || '';
    this.referralDate = data.referralDate || '';
    this.programs = data.programs || []; // Array of program IDs
    this.school = data.school || '';
    this.identificationNumber = data.identificationNumber || '';
    this.headshotPictureUrl = data.headshotPictureUrl || '';
    this.uploadedPhotos = data.uploadedPhotos || [];
    this.notes = data.notes || [];
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Create a new participant
  static async create(participantData) {
    try {
      const participant = new Participant(participantData);
      const docRef = await db.collection('participants').add({
        ...participant,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return { id: docRef.id, ...participant };
    } catch (error) {
      throw new Error(`Error creating participant: ${error.message}`);
    }
  }

  // Get participant by ID
  static async getById(id) {
    try {
      const doc = await db.collection('participants').doc(id).get();
      if (!doc.exists) {
        throw new Error('Participant not found');
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw new Error(`Error getting participant: ${error.message}`);
    }
  }

  // Get all participants with optional filters
  static async getAll(filters = {}) {
    try {
      let query = db.collection('participants');
      
      if (filters.isActive !== undefined) {
        query = query.where('isActive', '==', filters.isActive);
      }
      
      if (filters.school) {
        query = query.where('school', '==', filters.school);
      }
      
      if (filters.programId) {
        query = query.where('programs', 'array-contains', filters.programId);
      }
      
      const snapshot = await query.get();
      const participants = [];
      snapshot.forEach(doc => {
        participants.push({ id: doc.id, ...doc.data() });
      });
      
      return participants;
    } catch (error) {
      throw new Error(`Error getting participants: ${error.message}`);
    }
  }

  // Search participants by name or identification number
  static async search(searchTerm) {
    try {
      const participants = await this.getAll();
      return participants.filter(participant => 
        participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        participant.identificationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        participant.school.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      throw new Error(`Error searching participants: ${error.message}`);
    }
  }

  // Update participant
  static async update(id, updateData) {
    try {
      const updatePayload = {
        ...updateData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection('participants').doc(id).update(updatePayload);
      return await this.getById(id);
    } catch (error) {
      throw new Error(`Error updating participant: ${error.message}`);
    }
  }

  // Update participant's profile photo (headshot)
  static async updateProfilePhoto(participantId, cloudinaryData) {
    try {
      const photoData = {
        url: cloudinaryData.secure_url,
        publicId: cloudinaryData.public_id,
        format: cloudinaryData.format,
        width: cloudinaryData.width,
        height: cloudinaryData.height,
        uploadedAt: new Date()
      };

      await db.collection('participants').doc(participantId).update({
        headshotPictureUrl: photoData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return await this.getById(participantId);
    } catch (error) {
      throw new Error(`Error updating profile photo: ${error.message}`);
    }
  }

  // Add a program photo to the uploadedPhotos array
  static async addProgramPhoto(participantId, cloudinaryData, metadata = {}) {
    try {
      const photo = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        url: cloudinaryData.secure_url,
        publicId: cloudinaryData.public_id,
        format: cloudinaryData.format,
        width: cloudinaryData.width,
        height: cloudinaryData.height,
        programId: metadata.programId || null,
        caption: metadata.caption || '',
        activity: metadata.activity || '',
        uploadedBy: metadata.uploadedBy || 'system',
        uploadedAt: metadata.uploadedAt || new Date() // Use custom date or current date
      };
      
      await db.collection('participants').doc(participantId).update({
        uploadedPhotos: admin.firestore.FieldValue.arrayUnion(photo),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return await this.getById(participantId);
    } catch (error) {
      throw new Error(`Error adding program photo: ${error.message}`);
    }
  }

  // Remove profile photo
  static async removeProfilePhoto(participantId) {
    try {
      await db.collection('participants').doc(participantId).update({
        headshotPictureUrl: '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return await this.getById(participantId);
    } catch (error) {
      throw new Error(`Error removing profile photo: ${error.message}`);
    }
  }

  // Remove a program photo from uploadedPhotos
  static async removeProgramPhoto(participantId, photoId) {
    try {
      const participant = await this.getById(participantId);
      const updatedPhotos = participant.uploadedPhotos.filter(
        photo => photo.id !== photoId
      );
      
      await db.collection('participants').doc(participantId).update({
        uploadedPhotos: updatedPhotos,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return await this.getById(participantId);
    } catch (error) {
      throw new Error(`Error removing program photo: ${error.message}`);
    }
  }

  // Get all photos for a participant
  static async getPhotos(participantId, filters = {}) {
    try {
      const participant = await this.getById(participantId);
      let photos = participant.uploadedPhotos || [];
      
      // Filter by program if specified
      if (filters.programId) {
        photos = photos.filter(photo => photo.programId === filters.programId);
      }
      
      // Filter by activity if specified
      if (filters.activity) {
        photos = photos.filter(photo => photo.activity === filters.activity);
      }
      
      return {
        profilePhoto: participant.headshotPictureUrl,
        programPhotos: photos
      };
    } catch (error) {
      throw new Error(`Error getting photos: ${error.message}`);
    }
  }

  // Get photos by program
  static async getPhotosByProgram(participantId, programId) {
    try {
      const participant = await this.getById(participantId);
      return (participant.uploadedPhotos || []).filter(
        photo => photo.programId === programId
      );
    } catch (error) {
      throw new Error(`Error getting photos by program: ${error.message}`);
    }
  }

  // Add participant to program
  static async addToProgram(participantId, programId) {
    try {
      const participant = await this.getById(participantId);
      if (!participant.programs.includes(programId)) {
        await db.collection('participants').doc(participantId).update({
          programs: admin.firestore.FieldValue.arrayUnion(programId),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      return await this.getById(participantId);
    } catch (error) {
      throw new Error(`Error adding participant to program: ${error.message}`);
    }
  }

  // Remove participant from program
  static async removeFromProgram(participantId, programId) {
    try {
      await db.collection('participants').doc(participantId).update({
        programs: admin.firestore.FieldValue.arrayRemove(programId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return await this.getById(participantId);
    } catch (error) {
      throw new Error(`Error removing participant from program: ${error.message}`);
    }
  }

  // Add note to participant
  static async addNote(participantId, noteData) {
    try {
      const note = {
        ...noteData,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: noteData.createdAt || new Date() // Use custom date or current date
      };
      
      await db.collection('participants').doc(participantId).update({
        notes: admin.firestore.FieldValue.arrayUnion(note),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return await this.getById(participantId);
    } catch (error) {
      throw new Error(`Error adding note: ${error.message}`);
    }
  }

  // Remove note from participant
  static async removeNote(participantId, noteId) {
    try {
      const participant = await this.getById(participantId);
      const updatedNotes = participant.notes.filter(
        note => note.id !== noteId
      );
      
      if (updatedNotes.length === participant.notes.length) {
        throw new Error('Note not found');
      }
      
      await db.collection('participants').doc(participantId).update({
        notes: updatedNotes,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return await this.getById(participantId);
    } catch (error) {
      throw new Error(`Error removing note: ${error.message}`);
    }
  }

  // Delete participant (soft delete)
  static async delete(id) {
    try {
      await db.collection('participants').doc(id).update({
        isActive: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      throw new Error(`Error deleting participant: ${error.message}`);
    }
  }

  // Validate participant data
  static validate(data) {
    const errors = [];
    
    if (!data.name || data.name.trim().length < 2) {
      errors.push('Name is required and must be at least 2 characters long');
    }
    
    if (!data.dateOfBirth) {
      errors.push('Date of birth is required');
    } else if (!this.isValidDate(data.dateOfBirth)) {
      errors.push('Date of birth must be a valid date');
    }
    
    if (!data.identificationNumber || data.identificationNumber.trim().length < 3) {
      errors.push('Identification number is required and must be at least 3 characters long');
    }
    
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Email must be valid if provided');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Helper method to validate date
  static isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  // Helper method to validate email
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Get participant age
  static getAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
}

module.exports = Participant;