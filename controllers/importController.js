const multer = require('multer');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { processParticipantData, processProgramData, validateParticipantData, validateProgramData } = require('../config/openai');
const Participant = require('../models/Participant');
const Program = require('../models/Program');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}_${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/csv',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

class ImportController {
  // Import participants from Excel/CSV
  static async importParticipants(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { dryRun = 'false' } = req.body;
      const isDryRun = dryRun === 'true';

      // Parse the uploaded file
      const rawData = await ImportController.parseFile(req.file.path);
      
      // Process data with OpenAI
      const aiResult = await processParticipantData(rawData);
      
      if (!aiResult.success) {
        return res.status(500).json({ 
          error: 'Failed to process data with AI',
          details: aiResult.error 
        });
      }

      const processedParticipants = aiResult.data;
      
      // Validate and clean data
      const validationResults = processedParticipants.map(participant => {
        const validation = validateParticipantData(participant);
        return {
          participant,
          validation
        };
      });

      const validParticipants = validationResults
        .filter(result => result.validation.isValid)
        .map(result => result.participant);

      const invalidParticipants = validationResults
        .filter(result => !result.validation.isValid)
        .map(result => ({
          participant: result.participant,
          errors: result.validation.errors
        }));

      // If dry run, return results without saving
      if (isDryRun) {
        // Clean up uploaded file
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting temp file:', err);
        });

        return res.json({
          message: 'Dry run completed',
          summary: {
            totalProcessed: processedParticipants.length,
            validParticipants: validParticipants.length,
            invalidParticipants: invalidParticipants.length
          },
          validParticipants,
          invalidParticipants
        });
      }

      // Save valid participants to database
      const savedParticipants = [];
      const saveErrors = [];

      for (const participantData of validParticipants) {
        try {
          // Check if participant already exists by identification number
          const existingParticipants = await Participant.getAll();
          const existingParticipant = existingParticipants.find(
            p => p.identificationNumber === participantData.identificationNumber
          );

          if (existingParticipant) {
            saveErrors.push({
              participant: participantData,
              error: 'Participant with this identification number already exists'
            });
            continue;
          }

          const participant = await Participant.create(participantData);
          savedParticipants.push(participant);
        } catch (error) {
          saveErrors.push({
            participant: participantData,
            error: error.message
          });
        }
      }

      // Clean up uploaded file
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });

      res.json({
        message: 'Import completed',
        summary: {
          totalProcessed: processedParticipants.length,
          savedParticipants: savedParticipants.length,
          saveErrors: saveErrors.length,
          validationErrors: invalidParticipants.length
        },
        savedParticipants,
        saveErrors,
        invalidParticipants
      });

    } catch (error) {
      console.error('Import participants error:', error);
      
      // Clean up uploaded file if it exists
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting temp file:', err);
        });
      }
      
      res.status(500).json({ error: error.message });
    }
  }

  // Import programs from Excel/CSV
  static async importPrograms(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { dryRun = 'false' } = req.body;
      const isDryRun = dryRun === 'true';

      // Parse the uploaded file
      const rawData = await ImportController.parseFile(req.file.path);
      
      // Process data with OpenAI
      const aiResult = await processProgramData(rawData);
      
      if (!aiResult.success) {
        return res.status(500).json({ 
          error: 'Failed to process data with AI',
          details: aiResult.error 
        });
      }

      const processedPrograms = aiResult.data;
      
      // Validate and clean data
      const validationResults = processedPrograms.map(program => {
        const validation = validateProgramData(program);
        return {
          program,
          validation
        };
      });

      const validPrograms = validationResults
        .filter(result => result.validation.isValid)
        .map(result => result.program);

      const invalidPrograms = validationResults
        .filter(result => !result.validation.isValid)
        .map(result => ({
          program: result.program,
          errors: result.validation.errors
        }));

      // If dry run, return results without saving
      if (isDryRun) {
        // Clean up uploaded file
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting temp file:', err);
        });

        return res.json({
          message: 'Dry run completed',
          summary: {
            totalProcessed: processedPrograms.length,
            validPrograms: validPrograms.length,
            invalidPrograms: invalidPrograms.length
          },
          validPrograms,
          invalidPrograms
        });
      }

      // Save valid programs to database
      const savedPrograms = [];
      const saveErrors = [];

      for (const programData of validPrograms) {
        try {
          // Check if program already exists by name
          const existingPrograms = await Program.getAll();
          const existingProgram = existingPrograms.find(
            p => p.name.toLowerCase() === programData.name.toLowerCase()
          );

          if (existingProgram) {
            saveErrors.push({
              program: programData,
              error: 'Program with this name already exists'
            });
            continue;
          }

          const program = await Program.create(programData);
          savedPrograms.push(program);
        } catch (error) {
          saveErrors.push({
            program: programData,
            error: error.message
          });
        }
      }

      // Clean up uploaded file
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });

      res.json({
        message: 'Import completed',
        summary: {
          totalProcessed: processedPrograms.length,
          savedPrograms: savedPrograms.length,
          saveErrors: saveErrors.length,
          validationErrors: invalidPrograms.length
        },
        savedPrograms,
        saveErrors,
        invalidPrograms
      });

    } catch (error) {
      console.error('Import programs error:', error);
      
      // Clean up uploaded file if it exists
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting temp file:', err);
        });
      }
      
      res.status(500).json({ error: error.message });
    }
  }

  // Parse uploaded file (Excel or CSV)
  static async parseFile(filePath) {
    const fileExtension = path.extname(filePath).toLowerCase();
    
    if (fileExtension === '.csv') {
      return await this.parseCSV(filePath);
    } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      return await this.parseExcel(filePath);
    } else {
      throw new Error('Unsupported file format');
    }
  }

  // Parse CSV file
  static async parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  // Parse Excel file
  static async parseExcel(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      return data;
    } catch (error) {
      throw new Error(`Error parsing Excel file: ${error.message}`);
    }
  }

  // Get upload middleware
  static getUploadMiddleware() {
    return upload.single('file');
  }

  // Error handling middleware for multer
  static handleUploadError(error, req, res, next) {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size too large. Maximum size is 10MB.' });
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Unexpected file field.' });
      }
    }
    
    if (error.message === 'Only CSV and Excel files are allowed') {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
}

module.exports = ImportController;
