import UserCollection from '../db/models/User.js';
import createHttpError from 'http-errors';
import * as likesService from './likes.js';
import mongoose from 'mongoose';
// Получить свой профиль
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

// Обновить свой профиль
export const updateProfileController = async (req, res) => {
  const { _id } = req.user;
  const updatedUser = await UserCollection.findByIdAndUpdate(_id, req.body, {
    new: true,
    runValidators: true,
  }).select('-password');

  if (!updatedUser) throw createHttpError(404, 'User not found');

  res.json({
    status: 200,
    message: 'Profile updated successfully',
    data: updatedUser,
  });
};

// Получить все профили
export const getAllProfilesController = async (req, res) => {
  const users = await UserCollection.find().select('-password');
  res.json({
    status: 200,
    message: 'All profiles fetched successfully',
    data: users,
  });
};

// Получить профиль любого пользователя по ID
// export const getProfileByIdController = async (req, res) => {
//   const { id } = req.params;
//   const user = await UserCollection.findById(id).select('-password');
//   if (!user) throw createHttpError(404, 'User not found');

//   res.json({
//     status: 200,
//     message: 'User fetched successfully',
//     data: user,
//   });
// };
export const getProfileByIdController = async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(createHttpError(400, 'Invalid user id'));
  }

  const user = await UserCollection.findById(id).lean();
  if (!user) return next(createHttpError(404, 'User not found'));

  const viewer = req.user ?? null;
  const liked = viewer ? await likesService.isLikedBy(viewer._id, id) : false;
  const likesCount = user.likesCount ?? 0;

  delete user.password;

  res.json({
    status: 200,
    message: 'Profile fetched',
    data: {
      ...user,
      likesCount,
      liked: Boolean(liked),
    },
  });
};
