import cloudinary from 'cloudinary';
import { env } from './env.js';
import { CLOUDINARY } from '../constants/index.js';
import fs from 'fs/promises';

cloudinary.v2.config({
  secure: true,
  cloud_name: env(CLOUDINARY.CLOUD_NAME),
  api_key: env(CLOUDINARY.API_KEY),
  api_secret: env(CLOUDINARY.API_SECRET),
});

export const saveFileToCloudinary = async (file) => {
  if (env('ENABLE_CLOUDINARY') !== 'true') {
    return {
      url: `/uploads/${file.filename}`,
      public_id: null,
    };
  }

  try {
    const response = await cloudinary.v2.uploader.upload(file.path, {
      resource_type: 'auto',
    });
    return { url: response.secure_url, public_id: response.public_id };
  } catch (error) {
    console.error('❌ Error uploading to Cloudinary:', error.message);
    throw new Error('Failed to upload file to Cloudinary');
  } finally {
    try {
      await fs.unlink(file.path);
    } catch (err) {
      console.warn('⚠️ Failed to delete temp file:', err.message);
    }
  }
};

export const deleteFromCloudinary = async (publicId) => {
  if (!publicId || env('ENABLE_CLOUDINARY') !== 'true') return;

  try {
    await cloudinary.v2.uploader.destroy(publicId);
  } catch (error) {
    console.error('❌ Error deleting from Cloudinary:', error.message);
  }
};
