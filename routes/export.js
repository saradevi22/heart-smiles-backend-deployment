const express = require('express');
const ExportController = require('../controllers/exportController');
const { authenticateToken, requireStaffAccess } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and staff access
router.use(authenticateToken);
router.use(requireStaffAccess);

// Export participants to CSV
router.get('/participants', 
  ExportController.getExportValidationRules(),
  ExportController.exportParticipants
);

// Export programs to CSV
router.get('/programs', 
  ExportController.getExportValidationRules(),
  ExportController.exportPrograms
);

// Export combined data (participants and programs)
router.get('/combined', 
  ExportController.getExportValidationRules(),
  ExportController.exportCombined
);

module.exports = router;
