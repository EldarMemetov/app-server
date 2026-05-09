import fs from 'fs/promises';
import UserCollection from '../db/models/User.js';
import {
  saveFileToCloudinary,
  deleteFromCloudinary,
} from '../utils/saveFileToCloudinary.js';
import { cleanupFiles } from '../utils/cleanupFiles.js';
import { env } from '../utils/env.js';

const MAX_IMAGE_BYTES = Number(env('MAX_IMAGE_BYTES', 5 * 1024 * 1024));
const MAX_VIDEO_BYTES = Number(env('MAX_VIDEO_BYTES', 100 * 1024 * 1024));

const HERO_LIMITS = {
  showreel: { count: 1, allowed: ['video'] },
  slideshow: { count: 5, allowed: ['photo'] },
  cover: { count: 1, allowed: ['photo'] },
};

const checkFileSizeAndType = async (file) => {
  let stat;
  try {
    stat = await fs.stat(file.path);
  } catch {
    return { ok: false, reason: 'file_not_found', size: 0 };
  }
  const size = stat.size;
  if (!file.mimetype) return { ok: false, reason: 'unknown_mimetype', size };

  if (file.mimetype.startsWith('image/')) {
    if (size > MAX_IMAGE_BYTES)
      return { ok: false, reason: 'image_too_large', size };
    return { ok: true, type: 'photo', size };
  }
  if (file.mimetype.startsWith('video/')) {
    if (size > MAX_VIDEO_BYTES)
      return { ok: false, reason: 'video_too_large', size };
    return { ok: true, type: 'video', size };
  }
  return { ok: false, reason: 'unsupported_type', size };
};

const wipeHeroMedia = async (user) => {
  for (const item of user.heroMedia) {
    if (item.public_id) {
      try {
        await deleteFromCloudinary(
          item.public_id,
          item.type === 'video' ? 'video' : 'image',
        );
      } catch (err) {
        console.warn(
          'Failed to delete hero item from Cloudinary',
          item.public_id,
          err,
        );
      }
    }
  }
  user.heroMedia = [];
};

export const setHeroModeController = async (req, res) => {
  const { _id: userId } = req.user;
  const { heroType } = req.body;

  if (
    heroType !== null &&
    !['showreel', 'slideshow', 'cover'].includes(heroType)
  ) {
    return res
      .status(400)
      .json({ message: 'Invalid heroType', code: 'invalid_hero_type' });
  }

  const user = await UserCollection.findById(userId);
  if (!user)
    return res
      .status(404)
      .json({ message: 'User not found', code: 'user_not_found' });

  if (user.heroType !== heroType) {
    await wipeHeroMedia(user);
    user.heroType = heroType;
    await user.save();
  }

  res.status(200).json({
    status: 200,
    message: 'Hero mode updated',
    data: { heroType: user.heroType, heroMedia: user.heroMedia },
  });
};

export const uploadHeroMediaController = async (req, res) => {
  const { _id: userId } = req.user;

  if (!req.files || req.files.length === 0) {
    return res
      .status(400)
      .json({ message: 'No files uploaded', code: 'no_files' });
  }

  const user = await UserCollection.findById(userId);
  if (!user) {
    await cleanupFiles(req.files);
    return res
      .status(404)
      .json({ message: 'User not found', code: 'user_not_found' });
  }

  if (!user.heroType) {
    await cleanupFiles(req.files);
    return res.status(400).json({
      message: 'Hero mode is not selected. Choose a mode first.',
      code: 'hero_mode_not_set',
    });
  }

  const limits = HERO_LIMITS[user.heroType];

  if (user.heroMedia.length + req.files.length > limits.count) {
    await cleanupFiles(req.files);
    return res.status(400).json({
      message: `Mode "${user.heroType}" allows up to ${limits.count} file(s)`,
      code: 'too_many_files',
      maxAllowed: limits.count,
      currentCount: user.heroMedia.length,
    });
  }

  const checked = [];
  for (const file of req.files) {
    const check = await checkFileSizeAndType(file);
    if (!check.ok) {
      await cleanupFiles(req.files);
      const maxSize =
        check.reason === 'video_too_large'
          ? MAX_VIDEO_BYTES
          : check.reason === 'image_too_large'
            ? MAX_IMAGE_BYTES
            : undefined;
      return res.status(400).json({
        message: 'File rejected',
        code: check.reason,
        filename: file.originalname,
        size: check.size,
        maxAllowed: maxSize,
      });
    }
    if (!limits.allowed.includes(check.type)) {
      await cleanupFiles(req.files);
      return res.status(400).json({
        message: `Mode "${user.heroType}" allows only: ${limits.allowed.join(', ')}`,
        code: 'wrong_file_type',
        filename: file.originalname,
        expected: limits.allowed,
        got: check.type,
      });
    }
    checked.push({ file, type: check.type });
  }

  const uploaded = [];
  for (const { file, type } of checked) {
    try {
      const result = await saveFileToCloudinary(file);
      uploaded.push({
        type,
        url: result.url,
        public_id: result.public_id,
      });
    } catch (err) {
      console.error('Hero upload error', err?.message);
      for (const it of uploaded) {
        try {
          await deleteFromCloudinary(
            it.public_id,
            it.type === 'video' ? 'video' : 'image',
          );
        } catch {}
      }
      await cleanupFiles(req.files);
      return res.status(500).json({
        message: 'Error uploading file',
        code: 'processing_error',
        detail: err?.message,
      });
    }
  }

  user.heroMedia.push(...uploaded);
  await user.save();

  res.status(201).json({
    status: 201,
    message: 'Hero media uploaded',
    data: { heroType: user.heroType, heroMedia: user.heroMedia },
  });
};

export const deleteHeroMediaItemController = async (req, res) => {
  const { itemId } = req.params;
  const { _id: userId } = req.user;

  const user = await UserCollection.findById(userId);
  if (!user)
    return res
      .status(404)
      .json({ message: 'User not found', code: 'user_not_found' });

  const item = user.heroMedia.id(itemId);
  if (!item)
    return res
      .status(404)
      .json({ message: 'Item not found', code: 'item_not_found' });

  if (item.public_id) {
    try {
      await deleteFromCloudinary(
        item.public_id,
        item.type === 'video' ? 'video' : 'image',
      );
    } catch (err) {
      console.warn(
        'Failed to delete hero item from Cloudinary',
        item.public_id,
        err,
      );
    }
  }

  user.heroMedia = user.heroMedia.filter(
    (el) => String(el._id) !== String(itemId),
  );
  await user.save();

  res.status(200).json({
    status: 200,
    message: 'Hero item deleted',
    data: { heroType: user.heroType, heroMedia: user.heroMedia },
  });
};

export const clearHeroController = async (req, res) => {
  const { _id: userId } = req.user;

  const user = await UserCollection.findById(userId);
  if (!user)
    return res
      .status(404)
      .json({ message: 'User not found', code: 'user_not_found' });

  await wipeHeroMedia(user);
  user.heroType = null;
  await user.save();

  res.status(200).json({
    status: 200,
    message: 'Hero cleared',
    data: { heroType: null, heroMedia: [] },
  });
};
