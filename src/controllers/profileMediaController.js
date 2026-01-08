import UserCollection from '../db/models/User.js';
import {
  saveFileToCloudinary,
  deleteFromCloudinary,
} from '../utils/saveFileToCloudinary.js';
import fs from 'fs/promises';
import { env } from '../utils/env.js';

const MAX_IMAGE_BYTES = Number(env('MAX_IMAGE_BYTES', 5 * 1024 * 1024));

export const uploadProfilePhotoController = async (req, res) => {
  const { _id } = req.user;
  const user = await UserCollection.findById(_id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const mimetype = req.file.mimetype || '';
  if (!mimetype.startsWith('image/')) {
    try {
      await fs.unlink(req.file.path).catch(() => {});
    } catch (err) {
      console.warn('Failed to remove temp file', err);
    }
    return res.status(400).json({ message: 'Uploaded file is not an image' });
  }

  try {
    const stat = await fs.stat(req.file.path);
    if (stat.size > MAX_IMAGE_BYTES) {
      await fs.unlink(req.file.path).catch(() => {});
      return res
        .status(400)
        .json({ message: `Image too large (max ${MAX_IMAGE_BYTES} bytes)` });
    }
  } catch (statErr) {
    console.warn('Cannot stat uploaded file', statErr);
  }

  let uploadResult;
  try {
    uploadResult = await saveFileToCloudinary(req.file);
  } catch (uploadErr) {
    console.error('Failed upload to Cloudinary', uploadErr);

    try {
      await fs.unlink(req.file.path).catch(() => {});
    } catch (err) {
      console.warn('Failed to remove temp file', err);
    }
    return res.status(500).json({ message: 'Failed to upload profile photo' });
  }

  const newUrl = uploadResult.url;
  const newPublicId = uploadResult.public_id;

  const oldPublicId = user.photoPublicId || null;
  user.photo = newUrl;
  user.photoPublicId = newPublicId;
  await user.save();

  if (oldPublicId && oldPublicId !== newPublicId) {
    try {
      await deleteFromCloudinary(oldPublicId);
    } catch (delErr) {
      console.warn(
        'Failed to delete old profile photo from Cloudinary',
        delErr,
      );
    }
  }

  return res.status(200).json({
    status: 200,
    message: 'Profile photo updated successfully',
    data: { photo: user.photo },
  });
};
export const addPortfolioItemController = async (req, res) => {
  const { _id } = req.user;
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const { url, public_id } = await saveFileToCloudinary(req.file);
  const type = req.file.mimetype.startsWith('video') ? 'video' : 'photo';

  const updatedUser = await UserCollection.findByIdAndUpdate(
    _id,
    { $push: { portfolio: { type, url, description: '', public_id } } },
    { new: true },
  );

  res.status(201).json({
    status: 201,
    message: 'Portfolio item added successfully',
    data: updatedUser.portfolio,
  });
};

export const deletePortfolioItemController = async (req, res) => {
  const { _id } = req.user;
  const { itemId } = req.params;

  const user = await UserCollection.findById(_id);
  const item = user.portfolio.id(itemId);

  if (!item)
    return res.status(404).json({ message: 'Portfolio item not found' });

  if (item.public_id) {
    await deleteFromCloudinary(item.public_id);
  }

  await UserCollection.findByIdAndUpdate(_id, {
    $pull: { portfolio: { _id: itemId } },
  });

  res.status(200).json({
    status: 200,
    message: 'Portfolio item deleted successfully',
  });
};

export const deleteProfilePhotoController = async (req, res) => {
  const { _id } = req.user;
  const user = await UserCollection.findById(_id);

  if (!user) return res.status(404).json({ message: 'User not found' });

  if (user.photoPublicId) {
    await deleteFromCloudinary(user.photoPublicId);
  }

  user.photo = '';
  user.photoPublicId = '';
  await user.save();

  res.status(200).json({
    status: 200,
    message: 'Profile photo deleted successfully',
    data: { photo: user.photo },
  });
};
