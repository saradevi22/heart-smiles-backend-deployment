const express = require('express');
const ImportController = require('../controllers/importController');
const { authenticateToken, requireHeartSmilesStaff } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and HeartSmiles staff access
router.use(authenticateToken);
router.use(requireHeartSmilesStaff);

// Import participants from Excel/CSV
router.post('/participants', 
  ImportController.getUploadMiddleware(),
  ImportController.handleUploadError,
  ImportController.importParticipants
);

// Import programs from Excel/CSV
router.post('/programs', 
  ImportController.getUploadMiddleware(),
  ImportController.handleUploadError,
  ImportController.importPrograms
);

module.exports = router;
