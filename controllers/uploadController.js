const multer = require('multer');
const { uploadImage, uploadImageFromBuffer, deleteImage } = require('../config/cloudinary');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per request
  }
});

class UploadController {
  // Upload single image
  static async uploadSingle(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const { type = 'general', folder = 'heart-smiles' } = req.body;
      
      // Upload to Cloudinary
      const result = await uploadImageFromBuffer(req.file.buffer, {
        folder: `${folder}/${type}`,
        public_id: `${type}_${Date.now()}`
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        message: 'Image uploaded successfully',
        image: {
          url: result.url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          size: result.bytes
        }
      });
    } catch (error) {
      console.error('Upload single image error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Upload multiple images
  static async uploadMultiple(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No image files provided' });
      }

      const { type = 'general', folder = 'heart-smiles' } = req.body;
      const uploadPromises = req.files.map(async (file, index) => {
        const result = await uploadImageFromBuffer(file.buffer, {
          folder: `${folder}/${type}`,
          public_id: `${type}_${Date.now()}_${index}`
        });
        return result;
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(result => result.success);
      const failedUploads = results.filter(result => !result.success);

      if (successfulUploads.length === 0) {
        return res.status(500).json({ 
          error: 'All uploads failed',
          failures: failedUploads
        });
      }

      const images = successfulUploads.map(result => ({
        url: result.url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes
      }));

      res.json({
        message: `${successfulUploads.length} image(s) uploaded successfully`,
        images,
        failures: failedUploads.length > 0 ? failedUploads : undefined
      });
    } catch (error) {
      console.error('Upload multiple images error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Delete image
  static async deleteImage(req, res) {
    try {
      const { publicId } = req.params;

      if (!publicId) {
        return res.status(400).json({ error: 'Public ID is required' });
      }

      const result = await deleteImage(publicId);

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        message: 'Image deleted successfully',
        result: result.result
      });
    } catch (error) {
      console.error('Delete image error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get upload middleware for single file
  static getSingleUploadMiddleware() {
    return upload.single('image');
  }

  // Get upload middleware for multiple files
  static getMultipleUploadMiddleware() {
    return upload.array('images', 5);
  }

  // Error handling middleware for multer
  static handleUploadError(error, req, res, next) {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size too large. Maximum size is 10MB.' });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Too many files. Maximum is 5 files.' });
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Unexpected file field.' });
      }
    }
    
    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
}

module.exports = UploadController;
