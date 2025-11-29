const express = require('express');
const UploadController = require('../controllers/uploadController');
const { authenticateToken, requireHeartSmilesStaff } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and HeartSmiles staff access
router.use(authenticateToken);
router.use(requireHeartSmilesStaff);

// Upload single image
router.post('/single', 
  UploadController.getSingleUploadMiddleware(),
  UploadController.handleUploadError,
  UploadController.uploadSingle
);

// Upload multiple images
router.post('/multiple', 
  UploadController.getMultipleUploadMiddleware(),
  UploadController.handleUploadError,
  UploadController.uploadMultiple
);

// Delete image
router.delete('/:publicId', 
  UploadController.deleteImage
);

module.exports = router;
