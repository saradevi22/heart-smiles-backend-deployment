const { body, query, validationResult } = require('express-validator');
const Participant = require('../models/Participant');
const Program = require('../models/Program');

class ParticipantController {
  // Get all participants with optional filters
  static async getAll(req, res) {
    try {
      const { 
        school, 
        programId, 
        isActive, 
        search, 
        page = 1, 
        limit = 50 
      } = req.query;

      const filters = {};
      if (school) filters.school = school;
      if (programId) filters.programId = programId;
      if (isActive !== undefined) filters.isActive = isActive === 'true';

      let participants;
      
      if (search) {
        participants = await Participant.search(search);
      } else {
        participants = await Participant.getAll(filters);
      }

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedParticipants = participants.slice(startIndex, endIndex);

      res.json({
        participants: paginatedParticipants,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(participants.length / limit),
          totalItems: participants.length,
          itemsPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Get participants error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get participant by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const participant = await Participant.getById(id);
      
      // Get program details for each program ID
      if (participant.programs && participant.programs.length > 0) {
        const programPromises = participant.programs.map(programId => 
          Program.getById(programId).catch(() => null)
        );
        const programs = await Promise.all(programPromises);
        participant.programDetails = programs.filter(program => program !== null);
      } else {
        participant.programDetails = [];
      }

      res.json({ participant });
    } catch (error) {
      console.error('Get participant error:', error);
      if (error.message === 'Participant not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  // Create new participant
  static async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const participantData = req.body;

      // Validate participant data
      const validation = Participant.validate(participantData);
      if (!validation.isValid) {
        return res.status(400).json({ errors: validation.errors });
      }

      const participant = await Participant.create(participantData);
      res.status(201).json({
        message: 'Participant created successfully',
        participant
      });
    } catch (error) {
      console.error('Create participant error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Update participant
  static async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updateData = req.body;

      // Validate participant data if provided
      if (Object.keys(updateData).length > 0) {
        const validation = Participant.validate(updateData);
        if (!validation.isValid) {
          return res.status(400).json({ errors: validation.errors });
        }
      }

      const participant = await Participant.update(id, updateData);
      res.json({
        message: 'Participant updated successfully',
        participant
      });
    } catch (error) {
      console.error('Update participant error:', error);
      if (error.message === 'Participant not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  // Add participant to program
  static async addToProgram(req, res) {
    try {
      const { id, programId } = req.params;
      
      const participant = await Participant.addToProgram(id, programId);
      
      // Also add program to participant's programs list in Program model
      await Program.addParticipant(programId, id);
      
      res.json({
        message: 'Participant added to program successfully',
        participant
      });
    } catch (error) {
      console.error('Add participant to program error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Remove participant from program
  static async removeFromProgram(req, res) {
    try {
      const { id, programId } = req.params;
      
      const participant = await Participant.removeFromProgram(id, programId);
      
      // Also remove participant from program's participants list
      await Program.removeParticipant(programId, id);
      
      res.json({
        message: 'Participant removed from program successfully',
        participant
      });
    } catch (error) {
      console.error('Remove participant from program error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Add note to participant
  static async addNote(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { content, author, type = 'general', createdAt } = req.body;

      // Convert createdAt string to Date object if provided, otherwise use current date
      let noteCreatedAt;
      if (createdAt) {
        try {
          noteCreatedAt = new Date(createdAt);
          // Validate the date
          if (isNaN(noteCreatedAt.getTime())) {
            noteCreatedAt = new Date(); // Fallback to current date if invalid
          }
        } catch (e) {
          noteCreatedAt = new Date(); // Fallback to current date if conversion fails
        }
      } else {
        noteCreatedAt = new Date();
      }

      const noteData = {
        content,
        author: author || req.user.name,
        type,
        authorId: req.user.id,
        createdAt: noteCreatedAt
      };

      const participant = await Participant.addNote(id, noteData);
      res.json({
        message: 'Note added successfully',
        participant
      });
    } catch (error) {
      console.error('Add note error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Delete note from participant
  static async deleteNote(req, res) {
    try {
      const { id, noteId } = req.params;

      const participant = await Participant.removeNote(id, noteId);
      res.json({
        message: 'Note deleted successfully',
        participant
      });
    } catch (error) {
      console.error('Delete note error:', error);
      if (error.message === 'Participant not found' || error.message === 'Note not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  // Delete participant (soft delete)
  static async delete(req, res) {
    try {
      const { id } = req.params;
      await Participant.delete(id);
      res.json({ message: 'Participant deleted successfully' });
    } catch (error) {
      console.error('Delete participant error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get participant statistics
  static async getStats(req, res) {
    try {
      const participants = await Participant.getAll();
      
      const stats = {
        totalParticipants: participants.length,
        activeParticipants: participants.filter(p => p.isActive).length,
        participantsBySchool: {},
        participantsByProgram: {},
        ageGroups: {
          '13-17': 0,
          '18-21': 0,
          '22-25': 0,
          '25+': 0
        }
      };

      participants.forEach(participant => {
        // Count by school
        if (participant.school) {
          stats.participantsBySchool[participant.school] = 
            (stats.participantsBySchool[participant.school] || 0) + 1;
        }

        // Count by program
        participant.programs.forEach(programId => {
          stats.participantsByProgram[programId] = 
            (stats.participantsByProgram[programId] || 0) + 1;
        });

        // Count by age group
        if (participant.dateOfBirth) {
          const age = Participant.getAge(participant.dateOfBirth);
          if (age >= 13 && age <= 17) stats.ageGroups['13-17']++;
          else if (age >= 18 && age <= 21) stats.ageGroups['18-21']++;
          else if (age >= 22 && age <= 25) stats.ageGroups['22-25']++;
          else if (age > 25) stats.ageGroups['25+']++;
        }
      });

      res.json({ stats });
    } catch (error) {
      console.error('Get participant stats error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Validation rules for participant creation/update
  static getValidationRules() {
    return [
      body('name')
        .optional()
        .isLength({ min: 2 })
        .withMessage('Name must be at least 2 characters long'),
      body('dateOfBirth')
        .optional()
        .isISO8601()
        .withMessage('Date of birth must be a valid date'),
      body('identificationNumber')
        .optional()
        .isLength({ min: 3 })
        .withMessage('Identification number must be at least 3 characters long'),
      body('school')
        .optional()
        .isLength({ min: 2 })
        .withMessage('School name must be at least 2 characters long'),
      body('address')
        .optional()
        .isLength({ min: 5 })
        .withMessage('Address must be at least 5 characters long'),
      body('referralDate')
        .optional()
        .isISO8601()
        .withMessage('Referral date must be a valid date'),
      body('programs')
        .optional()
        .isArray()
        .withMessage('Programs must be an array'),
      body('headshotPictureUrl')
        .optional()
        .isURL()
        .withMessage('Headshot picture URL must be a valid URL')
    ];
  }

  // Update profile photo
  static async updateProfilePhoto(req, res) {
    try {
      const { id } = req.params;
      const { imageData } = req.body;

      if (!imageData || !imageData.url) {
        return res.status(400).json({ error: 'Image data is required' });
      }

      // Transform imageData to match what Participant model expects
      const cloudinaryData = {
        secure_url: imageData.url,
        public_id: imageData.public_id,
        format: imageData.format,
        width: imageData.width,
        height: imageData.height
      };

      const participant = await Participant.updateProfilePhoto(id, cloudinaryData);
      res.json({
        message: 'Profile photo updated successfully',
        participant
      });
    } catch (error) {
      console.error('Update profile photo error:', error);
      if (error.message === 'Participant not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  // Add program photo
  static async addProgramPhoto(req, res) {
    try {
      const { id } = req.params;
      const { imageData, programId, caption, activity, uploadedAt } = req.body;

      if (!imageData || !imageData.url) {
        return res.status(400).json({ error: 'Image data is required' });
      }

      // Transform imageData to match what Participant model expects
      const cloudinaryData = {
        secure_url: imageData.url,
        public_id: imageData.public_id,
        format: imageData.format,
        width: imageData.width,
        height: imageData.height
      };

      const metadata = {
        programId: programId || null,
        caption: caption || '',
        activity: activity || '',
        uploadedBy: req.user.name || req.user.id,
        uploadedAt: uploadedAt ? new Date(uploadedAt) : undefined
      };

      const participant = await Participant.addProgramPhoto(id, cloudinaryData, metadata);
      res.json({
        message: 'Program photo added successfully',
        participant
      });
    } catch (error) {
      console.error('Add program photo error:', error);
      if (error.message === 'Participant not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  // Delete program photo
  static async deleteProgramPhoto(req, res) {
    try {
      const { id, photoId } = req.params;

      const participant = await Participant.removeProgramPhoto(id, photoId);
      res.json({
        message: 'Photo deleted successfully',
        participant
      });
    } catch (error) {
      console.error('Delete program photo error:', error);
      if (error.message === 'Participant not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  // Validation rules for note addition
  static getNoteValidationRules() {
    return [
      body('content')
        .isLength({ min: 1 })
        .withMessage('Note content is required'),
      body('author')
        .optional()
        .isLength({ min: 2 })
        .withMessage('Author name must be at least 2 characters long'),
      body('type')
        .optional()
        .isIn(['general', 'session', 'milestone', 'concern'])
        .withMessage('Note type must be one of: general, session, milestone, concern')
    ];
  }
}

module.exports = ParticipantController;
