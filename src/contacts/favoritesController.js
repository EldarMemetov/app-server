import mongoose from 'mongoose';
import createHttpError from 'http-errors';
import Favorite from '../db/models/Favorite.js';
import PostCollection from '../db/models/Post.js';
import UserCollection from '../db/models/User.js';

const TARGET_MAP = { post: PostCollection, user: UserCollection };

export const toggleFavoriteController = async ({
  userId,
  targetType,
  targetId,
}) => {
  if (!['post', 'user'].includes(targetType))
    throw createHttpError(400, 'Invalid targetType');
  if (!mongoose.Types.ObjectId.isValid(targetId))
    throw createHttpError(400, 'Invalid targetId');
  if (!userId) throw createHttpError(401, 'User not authenticated');

  const TargetModel = TARGET_MAP[targetType];
  const exists = await TargetModel.exists({ _id: targetId });
  if (!exists) throw createHttpError(404, `${targetType} not found`);

  const removed = await Favorite.findOneAndDelete({
    userId,
    targetType,
    targetId,
  });
  if (removed) return { favorited: false };

  try {
    await Favorite.create({ userId, targetType, targetId });
    return { favorited: true };
  } catch (err) {
    if (err.code === 11000) {
      return { favorited: true };
    }
    throw err;
  }
};
