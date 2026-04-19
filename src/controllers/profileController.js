import UserCollection from '../db/models/User.js';
import createHttpError from 'http-errors';
import { saveFileToCloudinary } from '../utils/saveFileToCloudinary.js';

const buildSafeUpdate = (body) => {
  const update = {};

  const ALLOWED_SCALAR = [
    'name',
    'surname',
    'country',
    'city',
    'aboutMe',
    'experience',
    'onlineStatus',
    'availability',
  ];

  for (const field of ALLOWED_SCALAR) {
    if (body[field] !== undefined) {
      update[field] = body[field];
    }
  }

  // Массивы
  if (Array.isArray(body.roles)) update.roles = body.roles;
  if (Array.isArray(body.directions)) update.directions = body.directions;
  if (Array.isArray(body.languages)) update.languages = body.languages;
  if (Array.isArray(body.portfolio)) update.portfolio = body.portfolio;

  // socialLinks — мержим через dot-notation чтобы не затирать
  // незатронутые поля (например, если передан только instagram — telegram остаётся)
  if (body.socialLinks && typeof body.socialLinks === 'object') {
    const allowed = [
      'telegram',
      'whatsapp',
      'instagram',
      'facebook',
      'linkedin',
      'website',
    ];
    for (const key of allowed) {
      if (body.socialLinks[key] !== undefined) {
        update[`socialLinks.${key}`] = body.socialLinks[key];
      }
    }
  }

  return update;
};

// ─── Получить свой профиль ─────────────────────────────────────
export const getProfileController = async (req, res) => {
  const { _id } = req.user;
  const user = await UserCollection.findById(_id).select('-password');
  if (!user) throw createHttpError(404, 'User not found');

  res.json({
    status: 200,
    message: 'Profile fetched successfully',
    data: user,
  });
};

// ─── Обновить свой профиль ─────────────────────────────────────
export const updateProfileController = async (req, res) => {
  const { _id } = req.user;

  // Загрузка фото если есть
  if (req.file) {
    try {
      const { url } = await saveFileToCloudinary(req.file);
      req.body.photo = url;
    } catch (err) {
      console.error('Photo upload failed', err);
      throw createHttpError(500, 'Failed to upload photo');
    }
  }

  const safeUpdate = buildSafeUpdate(req.body);

  // Фото отдельно (не в ALLOWED_SCALAR, т.к. берём из Cloudinary)
  if (req.body.photo) safeUpdate.photo = req.body.photo;

  if (Object.keys(safeUpdate).length === 0) {
    throw createHttpError(400, 'No valid fields to update');
  }

  const updatedUser = await UserCollection.findByIdAndUpdate(
    _id,
    { $set: safeUpdate },
    { new: true, runValidators: true },
  ).select('-password');

  if (!updatedUser) throw createHttpError(404, 'User not found');

  res.json({
    status: 200,
    message: 'Profile updated successfully',
    data: updatedUser,
  });
};

// ─── Получить все профили ──────────────────────────────────────
export const getAllProfilesController = async (req, res) => {
  const users = await UserCollection.find().select('-password');
  res.json({
    status: 200,
    message: 'All profiles fetched successfully',
    data: users,
  });
};

// ─── Получить профиль по ID ────────────────────────────────────
export const getProfileByIdController = async (req, res) => {
  const { id } = req.params;
  const user = await UserCollection.findById(id).select('-password');
  if (!user) throw createHttpError(404, 'User not found');

  res.json({
    status: 200,
    message: 'User fetched successfully',
    data: user,
  });
};
