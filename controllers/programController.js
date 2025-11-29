const { body, query, validationResult } = require('express-validator');
const Program = require('../models/Program');
const Participant = require('../models/Participant');

class ProgramController {
  // Get all programs with optional filters
  static async getAll(req, res) {
    try {
      const { 
        isActive, 
        search, 
        page = 1, 
        limit = 50 
      } = req.query;

      const filters = {};
      if (isActive !== undefined) filters.isActive = isActive === 'true';

      let programs;
      
      if (search) {
        programs = await Program.search(search);
      } else {
        programs = await Program.getAll(filters);
      }

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedPrograms = programs.slice(startIndex, endIndex);

      res.json({
        programs: paginatedPrograms,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(programs.length / limit),
          totalItems: programs.length,
          itemsPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Get programs error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get program by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const program = await Program.getById(id);
      res.json({ program });
    } catch (error) {
      console.error('Get program error:', error);
      if (error.message === 'Program not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  // Get program by name
  static async getByName(req, res) {
    try {
      const { name } = req.params;
      const decodedName = decodeURIComponent(name);
      const program = await Program.getByName(decodedName);
      
      // Get participant details for each participant ID
      if (program.participants && program.participants.length > 0) {
        const participantPromises = program.participants.map(participantId => 
          Participant.getById(participantId).catch(() => null)
        );
        const participantDetails = await Promise.all(participantPromises);
        program.participantDetails = participantDetails.filter(p => p !== null);
      } else {
        program.participantDetails = [];
      }
      
      res.json({ program });
    } catch (error) {
      console.error('Get program by name error:', error);
      if (error.message === 'Program not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  // Get program with participant details
  static async getWithParticipants(req, res) {
    try {
      const { id } = req.params;
      const program = await Program.getWithParticipants(id);
      res.json({ program });
    } catch (error) {
      console.error('Get program with participants error:', error);
      if (error.message === 'Program not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  // Create new program
  static async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const programData = req.body;

      // Validate program data
      const validation = Program.validate(programData);
      if (!validation.isValid) {
        return res.status(400).json({ errors: validation.errors });
      }

      const program = await Program.create(programData);
      res.status(201).json({
        message: 'Program created successfully',
        program
      });
    } catch (error) {
      console.error('Create program error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Update program
  static async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updateData = req.body;

      // Validate program data if provided
      if (Object.keys(updateData).length > 0) {
        const validation = Program.validate(updateData);
        if (!validation.isValid) {
          return res.status(400).json({ errors: validation.errors });
        }
      }

      const program = await Program.update(id, updateData);
      res.json({
        message: 'Program updated successfully',
        program
      });
    } catch (error) {
      console.error('Update program error:', error);
      if (error.message === 'Program not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  // Update program by name
  static async updateByName(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name } = req.params;
      const decodedName = decodeURIComponent(name);
      const programByName = await Program.getByName(decodedName);
      const updateData = req.body;

      // Validate program data if provided
      if (Object.keys(updateData).length > 0) {
        const validation = Program.validate(updateData);
        if (!validation.isValid) {
          return res.status(400).json({ errors: validation.errors });
        }
      }

      const program = await Program.update(programByName.id, updateData);
      res.json({
        message: 'Program updated successfully',
        program
      });
    } catch (error) {
      console.error('Update program by name error:', error);
      if (error.message === 'Program not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  // Add participant to program
  static async addParticipant(req, res) {
    try {
      const { id, participantId } = req.params;
      
      const program = await Program.addParticipant(id, participantId);
      
      // Also add program to participant's programs list
      await Participant.addToProgram(participantId, id);
      
      res.json({
        message: 'Participant added to program successfully',
        program
      });
    } catch (error) {
      console.error('Add participant to program error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Add participant to program by name
  static async addParticipantByName(req, res) {
    try {
      const { name } = req.params;
      const decodedName = decodeURIComponent(name);
      const program = await Program.getByName(decodedName);
      const { participantId } = req.body;
      
      if (!participantId) {
        return res.status(400).json({ error: 'Participant ID is required' });
      }
      
      const updatedProgram = await Program.addParticipant(program.id, participantId);
      
      // Also add program to participant's programs list
      await Participant.addToProgram(participantId, program.id);
      
      res.json({
        message: 'Participant added to program successfully',
        program: updatedProgram
      });
    } catch (error) {
      console.error('Add participant to program by name error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Remove participant from program
  static async removeParticipant(req, res) {
    try {
      const { id, participantId } = req.params;
      
      const program = await Program.removeParticipant(id, participantId);
      
      // Also remove participant from program's participants list
      await Participant.removeFromProgram(participantId, id);
      
      res.json({
        message: 'Participant removed from program successfully',
        program
      });
    } catch (error) {
      console.error('Remove participant from program error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Remove participant from program by name
  static async removeParticipantByName(req, res) {
    try {
      const { name, participantId } = req.params;
      const decodedName = decodeURIComponent(name);
      const program = await Program.getByName(decodedName);
      
      const updatedProgram = await Program.removeParticipant(program.id, participantId);
      
      // Also remove participant from program's participants list
      await Participant.removeFromProgram(participantId, program.id);
      
      res.json({
        message: 'Participant removed from program successfully',
        program: updatedProgram
      });
    } catch (error) {
      console.error('Remove participant from program by name error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Delete program (soft delete)
  static async delete(req, res) {
    try {
      const { id } = req.params;
      await Program.delete(id);
      res.json({ message: 'Program deleted successfully' });
    } catch (error) {
      console.error('Delete program error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get program statistics
  static async getStats(req, res) {
    try {
      const { id } = req.params;
      const stats = await Program.getStats(id);
      res.json({ stats });
    } catch (error) {
      console.error('Get program stats error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get all program statistics
  static async getAllStats(req, res) {
    try {
      const programs = await Program.getAll();
      
      const stats = {
        totalPrograms: programs.length,
        activePrograms: programs.filter(p => p.isActive).length,
        totalParticipantsAcrossPrograms: 0,
        programsWithParticipants: 0
      };

      for (const program of programs) {
        if (program.participants && program.participants.length > 0) {
          stats.totalParticipantsAcrossPrograms += program.participants.length;
          stats.programsWithParticipants++;
        }
      }

      res.json({ stats });
    } catch (error) {
      console.error('Get all program stats error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Validation rules for program creation/update
  static getValidationRules() {
    return [
      body('name')
        .optional()
        .isLength({ min: 2 })
        .withMessage('Program name must be at least 2 characters long'),
      body('description')
        .optional()
        .isLength({ min: 2 })
        .withMessage('Program description must be at least 2 characters long if provided'),
      body('participants')
        .optional()
        .isArray()
        .withMessage('Participants must be an array')
    ];
  }
}

module.exports = ProgramController;
