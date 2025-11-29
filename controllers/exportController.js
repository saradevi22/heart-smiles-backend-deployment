const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');
const Participant = require('../models/Participant');
const Program = require('../models/Program');
const { query, validationResult } = require('express-validator');

class ExportController {
  // Export participants to CSV
  static async exportParticipants(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { 
        programId, 
        school, 
        isActive = 'true',
        dateFrom,
        dateTo,
        format = 'csv'
      } = req.query;

      // Build filters
      const filters = {};
      if (programId) filters.programId = programId;
      if (school) filters.school = school;
      if (isActive !== undefined) filters.isActive = isActive === 'true';

      // Get participants
      let participants = await Participant.getAll(filters);

      // Apply date filters if provided
      if (dateFrom || dateTo) {
        participants = participants.filter(participant => {
          const referralDate = new Date(participant.referralDate);
          const fromDate = dateFrom ? new Date(dateFrom) : null;
          const toDate = dateTo ? new Date(dateTo) : null;

          if (fromDate && referralDate < fromDate) return false;
          if (toDate && referralDate > toDate) return false;
          return true;
        });
      }

      // Get program details for participants
      const participantsWithPrograms = await Promise.all(
        participants.map(async (participant) => {
          const programDetails = [];
          if (participant.programs && participant.programs.length > 0) {
            for (const programId of participant.programs) {
              try {
                const program = await Program.getById(programId);
                programDetails.push(program.name);
              } catch (error) {
                console.error(`Error fetching program ${programId}:`, error);
              }
            }
          }

          return {
            ...participant,
            programNames: programDetails.join('; '),
            age: Participant.getAge(participant.dateOfBirth),
            notesCount: participant.notes ? participant.notes.length : 0,
            photosCount: participant.uploadedPhotos ? participant.uploadedPhotos.length : 0
          };
        })
      );

      // Prepare CSV data (excluding images as requested)
      const csvData = participantsWithPrograms.map(participant => ({
        'ID': participant.identificationNumber || '',
        'Name': participant.name || '',
        'Date of Birth': participant.dateOfBirth || '',
        'Age': participant.age || '',
        'School': participant.school || '',
        'Address': participant.address || '',
        'Referral Date': participant.referralDate || '',
        'Programs': participant.programNames || '',
        'Status': participant.isActive ? 'Active' : 'Inactive',
        'Notes Count': participant.notesCount,
        'Photos Count': participant.photosCount,
        'Created Date': participant.createdAt ? new Date(participant.createdAt).toLocaleDateString() : '',
        'Updated Date': participant.updatedAt ? new Date(participant.updatedAt).toLocaleDateString() : ''
      }));

      // Create temporary file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `participants_export_${timestamp}.csv`;
      const filepath = path.join(__dirname, '../temp', filename);

      // Ensure temp directory exists
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Create CSV writer
      const csvWriter = createCsvWriter({
        path: filepath,
        header: [
          { id: 'ID', title: 'ID' },
          { id: 'Name', title: 'Name' },
          { id: 'Date of Birth', title: 'Date of Birth' },
          { id: 'Age', title: 'Age' },
          { id: 'School', title: 'School' },
          { id: 'Address', title: 'Address' },
          { id: 'Referral Date', title: 'Referral Date' },
          { id: 'Programs', title: 'Programs' },
          { id: 'Status', title: 'Status' },
          { id: 'Notes Count', title: 'Notes Count' },
          { id: 'Photos Count', title: 'Photos Count' },
          { id: 'Created Date', title: 'Created Date' },
          { id: 'Updated Date', title: 'Updated Date' }
        ]
      });

      // Write CSV
      await csvWriter.writeRecords(csvData);

      // Send file
      res.download(filepath, filename, (err) => {
        if (err) {
          console.error('Download error:', err);
        }
        // Clean up temporary file
        fs.unlink(filepath, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
        });
      });

    } catch (error) {
      console.error('Export participants error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Export programs to CSV
  static async exportPrograms(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { isActive = 'true' } = req.query;

      // Build filters
      const filters = {};
      if (isActive !== undefined) filters.isActive = isActive === 'true';

      // Get programs
      const programs = await Program.getAll(filters);

      // Get program details with participant counts
      const programsWithStats = await Promise.all(
        programs.map(async (program) => {
          const participantCount = program.participants ? program.participants.length : 0;
          
          return {
            ...program,
            participantCount,
            createdDate: program.createdAt ? new Date(program.createdAt).toLocaleDateString() : '',
            updatedDate: program.updatedAt ? new Date(program.updatedAt).toLocaleDateString() : ''
          };
        })
      );

      // Prepare CSV data
      const csvData = programsWithStats.map(program => ({
        'Program ID': program.id || '',
        'Program Name': program.name || '',
        'Description': program.description || '',
        'Participant Count': program.participantCount,
        'Status': program.isActive ? 'Active' : 'Inactive',
        'Created Date': program.createdDate,
        'Updated Date': program.updatedDate
      }));

      // Create temporary file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `programs_export_${timestamp}.csv`;
      const filepath = path.join(__dirname, '../temp', filename);

      // Ensure temp directory exists
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Create CSV writer
      const csvWriter = createCsvWriter({
        path: filepath,
        header: [
          { id: 'Program ID', title: 'Program ID' },
          { id: 'Program Name', title: 'Program Name' },
          { id: 'Description', title: 'Description' },
          { id: 'Participant Count', title: 'Participant Count' },
          { id: 'Status', title: 'Status' },
          { id: 'Created Date', title: 'Created Date' },
          { id: 'Updated Date', title: 'Updated Date' }
        ]
      });

      // Write CSV
      await csvWriter.writeRecords(csvData);

      // Send file
      res.download(filepath, filename, (err) => {
        if (err) {
          console.error('Download error:', err);
        }
        // Clean up temporary file
        fs.unlink(filepath, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
        });
      });

    } catch (error) {
      console.error('Export programs error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Export combined data (participants and programs)
  static async exportCombined(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { isActive = 'true' } = req.query;

      // Get both participants and programs
      const participants = await Participant.getAll({ isActive: isActive === 'true' });
      const programs = await Program.getAll({ isActive: isActive === 'true' });

      // Prepare summary data
      const summaryData = [
        { 'Data Type': 'Summary', 'Field': 'Total Participants', 'Value': participants.length },
        { 'Data Type': 'Summary', 'Field': 'Active Participants', 'Value': participants.filter(p => p.isActive).length },
        { 'Data Type': 'Summary', 'Field': 'Total Programs', 'Value': programs.length },
        { 'Data Type': 'Summary', 'Field': 'Active Programs', 'Value': programs.filter(p => p.isActive).length },
        { 'Data Type': 'Summary', 'Field': 'Export Date', 'Value': new Date().toLocaleDateString() },
        { 'Data Type': 'Summary', 'Field': 'Export Time', 'Value': new Date().toLocaleTimeString() }
      ];

      // Get participant data
      const participantsWithPrograms = await Promise.all(
        participants.map(async (participant) => {
          const programDetails = [];
          if (participant.programs && participant.programs.length > 0) {
            for (const programId of participant.programs) {
              try {
                const program = await Program.getById(programId);
                programDetails.push(program.name);
              } catch (error) {
                console.error(`Error fetching program ${programId}:`, error);
              }
            }
          }

          return {
            'Data Type': 'Participant',
            'ID': participant.identificationNumber || '',
            'Name': participant.name || '',
            'School': participant.school || '',
            'Programs': programDetails.join('; '),
            'Status': participant.isActive ? 'Active' : 'Inactive'
          };
        })
      );

      // Get program data
      const programData = programs.map(program => ({
        'Data Type': 'Program',
        'Program ID': program.id || '',
        'Program Name': program.name || '',
        'Description': program.description || '',
        'Participant Count': program.participants ? program.participants.length : 0,
        'Status': program.isActive ? 'Active' : 'Inactive'
      }));

      // Combine all data
      const csvData = [...summaryData, ...participantsWithPrograms, ...programData];

      // Create temporary file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `heart_smiles_combined_export_${timestamp}.csv`;
      const filepath = path.join(__dirname, '../temp', filename);

      // Ensure temp directory exists
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Create CSV writer
      const csvWriter = createCsvWriter({
        path: filepath,
        header: [
          { id: 'Data Type', title: 'Data Type' },
          { id: 'ID', title: 'ID' },
          { id: 'Name', title: 'Name' },
          { id: 'School', title: 'School' },
          { id: 'Programs', title: 'Programs' },
          { id: 'Program ID', title: 'Program ID' },
          { id: 'Program Name', title: 'Program Name' },
          { id: 'Description', title: 'Description' },
          { id: 'Participant Count', title: 'Participant Count' },
          { id: 'Field', title: 'Field' },
          { id: 'Value', title: 'Value' },
          { id: 'Status', title: 'Status' }
        ]
      });

      // Write CSV
      await csvWriter.writeRecords(csvData);

      // Send file
      res.download(filepath, filename, (err) => {
        if (err) {
          console.error('Download error:', err);
        }
        // Clean up temporary file
        fs.unlink(filepath, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
        });
      });

    } catch (error) {
      console.error('Export combined error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Validation rules for export queries
  static getExportValidationRules() {
    return [
      query('programId')
        .optional()
        .isString()
        .withMessage('Program ID must be a string'),
      query('school')
        .optional()
        .isString()
        .withMessage('School must be a string'),
      query('isActive')
        .optional()
        .isIn(['true', 'false'])
        .withMessage('isActive must be true or false'),
      query('dateFrom')
        .optional()
        .isISO8601()
        .withMessage('Date from must be a valid date'),
      query('dateTo')
        .optional()
        .isISO8601()
        .withMessage('Date to must be a valid date'),
      query('format')
        .optional()
        .isIn(['csv'])
        .withMessage('Format must be csv')
    ];
  }
}

module.exports = ExportController;
