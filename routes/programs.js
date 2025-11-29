const express = require('express');
const ProgramController = require('../controllers/programController');
const { authenticateToken, requireStaffAccess, requireReadOnlyAccess, requireHeartSmilesStaff } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);
router.use(requireStaffAccess);

// Get all programs (both HeartSmiles and UMD staff can read)
router.get('/', 
  ProgramController.getAll
);

// Get all program statistics (both HeartSmiles and UMD staff can read)
router.get('/stats/overview', 
  ProgramController.getAllStats
);

// Get program by name (both HeartSmiles and UMD staff can read)
// This route must come before /:id to avoid conflicts
router.get('/name/:name', 
  ProgramController.getByName
);

// Get program by ID (both HeartSmiles and UMD staff can read)
router.get('/:id', 
  ProgramController.getById
);

// Get program with participant details (both HeartSmiles and UMD staff can read)
router.get('/:id/participants', 
  ProgramController.getWithParticipants
);

// Get program statistics (both HeartSmiles and UMD staff can read)
router.get('/:id/stats', 
  ProgramController.getStats
);

// Create program (only HeartSmiles staff can create)
router.post('/', 
  requireHeartSmilesStaff,
  requireReadOnlyAccess,
  ProgramController.getValidationRules(),
  ProgramController.create
);

// Update program by name (only HeartSmiles staff can update)
router.put('/name/:name', 
  requireHeartSmilesStaff,
  requireReadOnlyAccess,
  ProgramController.getValidationRules(),
  ProgramController.updateByName
);

// Update program (only HeartSmiles staff can update)
router.put('/:id', 
  requireHeartSmilesStaff,
  requireReadOnlyAccess,
  ProgramController.getValidationRules(),
  ProgramController.update
);

// Add participant to program by name (only HeartSmiles staff can do this)
router.post('/name/:name/participants', 
  requireHeartSmilesStaff,
  requireReadOnlyAccess,
  ProgramController.addParticipantByName
);

// Remove participant from program by name (only HeartSmiles staff can do this)
router.delete('/name/:name/participants/:participantId', 
  requireHeartSmilesStaff,
  requireReadOnlyAccess,
  ProgramController.removeParticipantByName
);

// Add participant to program (only HeartSmiles staff can do this)
router.post('/:id/participants/:participantId', 
  requireHeartSmilesStaff,
  requireReadOnlyAccess,
  ProgramController.addParticipant
);

// Remove participant from program (only HeartSmiles staff can do this)
router.delete('/:id/participants/:participantId', 
  requireHeartSmilesStaff,
  requireReadOnlyAccess,
  ProgramController.removeParticipant
);

// Delete program (only HeartSmiles staff can delete)
router.delete('/:id', 
  requireHeartSmilesStaff,
  requireReadOnlyAccess,
  ProgramController.delete
);

module.exports = router;
