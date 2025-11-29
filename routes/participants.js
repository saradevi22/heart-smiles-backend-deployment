const express = require('express');
const ParticipantController = require('../controllers/participantController');
const { authenticateToken, requireStaffAccess, requireReadOnlyAccess, requireHeartSmilesStaff } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);
router.use(requireStaffAccess);

// Get all participants (both HeartSmiles and UMD staff can read)
router.get('/', 
  ParticipantController.getAll
);

// Get participant by ID (both HeartSmiles and UMD staff can read)
router.get('/:id', 
  ParticipantController.getById
);

// Get participant statistics (both HeartSmiles and UMD staff can read)
router.get('/stats/overview', 
  ParticipantController.getStats
);

// Create participant (only HeartSmiles staff can create)
router.post('/', 
  requireHeartSmilesStaff,
  requireReadOnlyAccess,
  ParticipantController.getValidationRules(),
  ParticipantController.create
);

// Update participant (only HeartSmiles staff can update)
router.put('/:id', 
  requireHeartSmilesStaff,
  requireReadOnlyAccess,
  ParticipantController.getValidationRules(),
  ParticipantController.update
);

// Add participant to program (only HeartSmiles staff can do this)
router.post('/:id/programs/:programId', 
  requireHeartSmilesStaff,
  requireReadOnlyAccess,
  ParticipantController.addToProgram
);

// Remove participant from program (only HeartSmiles staff can do this)
router.delete('/:id/programs/:programId', 
  requireHeartSmilesStaff,
  requireReadOnlyAccess,
  ParticipantController.removeFromProgram
);

// Add note to participant (only HeartSmiles staff can do this)
router.post('/:id/notes', 
  requireHeartSmilesStaff,
  requireReadOnlyAccess,
  ParticipantController.getNoteValidationRules(),
  ParticipantController.addNote
);

// Delete note from participant (only HeartSmiles staff can do this)
router.delete('/:id/notes/:noteId', 
  requireHeartSmilesStaff,
  requireReadOnlyAccess,
  ParticipantController.deleteNote
);

// Update profile photo (only HeartSmiles staff can do this)
router.put('/:id/profile-photo', 
  requireHeartSmilesStaff,
  requireReadOnlyAccess,
  ParticipantController.updateProfilePhoto
);

// Add program photo (only HeartSmiles staff can do this)
router.post('/:id/program-photo', 
  requireHeartSmilesStaff,
  requireReadOnlyAccess,
  ParticipantController.addProgramPhoto
);

// Delete program photo (only HeartSmiles staff can do this)
router.delete('/:id/program-photo/:photoId', 
  requireHeartSmilesStaff,
  requireReadOnlyAccess,
  ParticipantController.deleteProgramPhoto
);

// Delete participant (only HeartSmiles staff can delete)
router.delete('/:id', 
  requireHeartSmilesStaff,
  requireReadOnlyAccess,
  ParticipantController.delete
);

module.exports = router;
