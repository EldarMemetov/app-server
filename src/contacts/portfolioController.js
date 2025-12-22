// import UserCollection from '../db/models/User.js';
// import {
//   saveFileToCloudinary,
//   deleteFromCloudinary,
// } from '../utils/saveFileToCloudinary.js';

// // === Добавить элемент в портфолио ===
// export const addPortfolioItemController = async (req, res) => {
//   const { _id: userId } = req.user;

//   if (!req.files || req.files.length === 0) {
//     return res.status(400).json({ message: 'No files uploaded' });
//   }

//   const user = await UserCollection.findById(userId);
//   if (!user) return res.status(404).json({ message: 'User not found' });

//   // Считаем текущие фото и видео
//   const photoCount = user.portfolio.filter(
//     (item) => item.type === 'photo',
//   ).length;
//   const videoCount = user.portfolio.filter(
//     (item) => item.type === 'video',
//   ).length;

//   // Считаем новые
//   const newPhotoCount = req.files.filter((f) =>
//     f.mimetype.startsWith('image'),
//   ).length;
//   const newVideoCount = req.files.filter((f) =>
//     f.mimetype.startsWith('video'),
//   ).length;

//   // Проверяем лимиты
//   if (photoCount + newPhotoCount > 10) {
//     return res
//       .status(400)
//       .json({ message: 'Portfolio can have maximum 10 photos' });
//   }
//   if (videoCount + newVideoCount > 1) {
//     return res.status(400).json({ message: 'Portfolio can have only 1 video' });
//   }

//   const uploadedItems = [];

//   for (const file of req.files) {
//     const { url, public_id } = await saveFileToCloudinary(file);
//     const type = file.mimetype.startsWith('video') ? 'video' : 'photo';
//     uploadedItems.push({ type, url, description: '', public_id });
//   }

//   user.portfolio.push(...uploadedItems);
//   await user.save();

//   res.status(201).json({
//     status: 201,
//     message: 'Portfolio items uploaded successfully',
//     data: user.portfolio,
//   });
// };

// // === Удалить элемент портфолио ===
// export const deletePortfolioItemController = async (req, res) => {
//   const { itemId } = req.params;
//   const { _id: userId } = req.user;

//   const user = await UserCollection.findById(userId);
//   if (!user) return res.status(404).json({ message: 'User not found' });

//   const item = user.portfolio.id(itemId);
//   if (!item)
//     return res.status(404).json({ message: 'Portfolio item not found' });

//   // Удаляем с Cloudinary, если включено
//   if (item.public_id) {
//     await deleteFromCloudinary(item.public_id);
//   }

//   user.portfolio = user.portfolio.filter(
//     (el) => String(el._id) !== String(itemId),
//   );
//   await user.save();

//   res.status(200).json({
//     status: 200,
//     message: 'Portfolio item deleted successfully',
//     data: user.portfolio,
//   });
// };
// portfolioController.js
import fs from 'fs/promises';
import UserCollection from '../db/models/User.js';
import {
  saveFileToCloudinary,
  deleteFromCloudinary,
} from '../utils/saveFileToCloudinary.js';
import { env } from '../utils/env.js';

const MAX_IMAGE_BYTES = Number(env('MAX_IMAGE_BYTES', 5 * 1024 * 1024));

const MAX_VIDEO_BYTES = Number(env('MAX_VIDEO_BYTES', 100 * 1024 * 1024));

const checkFileSizeAndType = async (file) => {
  const stat = await fs.stat(file.path);
  const size = stat.size;
  if (!file.mimetype) return { ok: false, reason: 'unknown_mimetype', size };

  if (file.mimetype.startsWith('image')) {
    if (size > MAX_IMAGE_BYTES)
      return { ok: false, reason: 'image_too_large', size };
    return { ok: true, type: 'photo', size };
  }

  if (file.mimetype.startsWith('video')) {
    if (size > MAX_VIDEO_BYTES)
      return { ok: false, reason: 'video_too_large', size };
    return { ok: true, type: 'video', size };
  }

  return { ok: false, reason: 'unsupported_type', size };
};

export const addPortfolioItemController = async (req, res) => {
  const { _id: userId } = req.user;

  if (!req.files || req.files.length === 0) {
    return res
      .status(400)
      .json({ message: 'No files uploaded', code: 'no_files' });
  }

  const user = await UserCollection.findById(userId);
  if (!user) {
    await Promise.all(req.files.map((f) => fs.unlink(f.path).catch(() => {})));
    return res
      .status(404)
      .json({ message: 'User not found', code: 'user_not_found' });
  }

  const photoCount = user.portfolio.filter(
    (item) => item.type === 'photo',
  ).length;
  const videoCount = user.portfolio.filter(
    (item) => item.type === 'video',
  ).length;

  const newPhotoCount = req.files.filter(
    (f) => f.mimetype && f.mimetype.startsWith('image'),
  ).length;
  const newVideoCount = req.files.filter(
    (f) => f.mimetype && f.mimetype.startsWith('video'),
  ).length;

  if (photoCount + newPhotoCount > 10) {
    await Promise.all(req.files.map((f) => fs.unlink(f.path).catch(() => {})));
    return res.status(400).json({
      message: 'Portfolio can have maximum 10 photos',
      code: 'too_many_photos',
    });
  }
  if (videoCount + newVideoCount > 1) {
    await Promise.all(req.files.map((f) => fs.unlink(f.path).catch(() => {})));
    return res.status(400).json({
      message: 'Portfolio can have only 1 video',
      code: 'too_many_videos',
    });
  }

  const uploadedItems = [];

  for (const file of req.files) {
    try {
      const check = await checkFileSizeAndType(file);
      if (!check.ok) {
        await fs.unlink(file.path).catch(() => {});

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

      const { url, public_id } = await saveFileToCloudinary(file);

      const type = check.type;
      uploadedItems.push({ type, url, description: '', public_id });
    } catch (err) {
      console.error(
        'Error processing file',
        file.originalname,
        err && err.message ? err.message : err,
      );
      await fs.unlink(file.path).catch(() => {});
      return res.status(500).json({
        message: 'Error processing file',
        code: 'processing_error',
        detail: err?.message,
      });
    }
  }

  user.portfolio.push(...uploadedItems);
  await user.save();

  res.status(201).json({
    status: 201,
    message: 'Portfolio items uploaded successfully',
    data: user.portfolio,
  });
};

export const deletePortfolioItemController = async (req, res) => {
  const { itemId } = req.params;
  const { _id: userId } = req.user;

  const user = await UserCollection.findById(userId);
  if (!user)
    return res
      .status(404)
      .json({ message: 'User not found', code: 'user_not_found' });

  const item = user.portfolio.id(itemId);
  if (!item)
    return res
      .status(404)
      .json({ message: 'Portfolio item not found', code: 'item_not_found' });

  if (item.public_id) {
    await deleteFromCloudinary(item.public_id);
  }

  user.portfolio = user.portfolio.filter(
    (el) => String(el._id) !== String(itemId),
  );
  await user.save();

  res.status(200).json({
    status: 200,
    message: 'Portfolio item deleted successfully',
    data: user.portfolio,
  });
};
