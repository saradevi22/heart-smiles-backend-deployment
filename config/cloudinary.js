const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload image to Cloudinary
const uploadImage = async (file, options = {}) => {
  try {
    const defaultOptions = {
      folder: 'heart-smiles',
      quality: 'auto',
      fetch_format: 'auto',
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' },
        { width: 1200, height: 1200, crop: 'limit' } // Max size with high quality
      ]
    };

    const uploadOptions = { ...defaultOptions, ...options };
    
    const result = await cloudinary.uploader.upload(file.path, uploadOptions);
    
    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Upload image from buffer (for direct uploads)
const uploadImageFromBuffer = async (buffer, options = {}) => {
  try {
    const defaultOptions = {
      folder: 'heart-smiles',
      quality: 'auto',
      fetch_format: 'auto',
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' },
        { width: 1200, height: 1200, crop: 'limit' }
      ]
    };

    const uploadOptions = { ...defaultOptions, ...options };
    
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }).end(buffer);
    });
    
    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary buffer upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result: result.result
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Generate optimized image URL
const getOptimizedImageUrl = (publicId, options = {}) => {
  const defaultOptions = {
    quality: 'auto',
    fetch_format: 'auto',
    width: 400,
    height: 400,
    crop: 'fill',
    gravity: 'face'
  };

  const transformOptions = { ...defaultOptions, ...options };
  
  return cloudinary.url(publicId, {
    ...transformOptions,
    secure: true
  });
};

module.exports = {
  cloudinary,
  uploadImage,
  uploadImageFromBuffer,
  deleteImage,
  getOptimizedImageUrl
};
