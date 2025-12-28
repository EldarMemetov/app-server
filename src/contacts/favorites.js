import mongoose from 'mongoose';
import createHttpError from 'http-errors';
import Favorite from '../db/models/Favorite.js';
import PostCollection from '../db/models/Post.js';
import UserCollection from '../db/models/User.js';

const TARGET_MAP = {
  post: PostCollection,
  user: UserCollection,
};

export const toggleFavorite = async ({ userId, targetType, targetId }) => {
  if (!['post', 'user'].includes(targetType)) {
    throw createHttpError(400, 'Invalid targetType');
  }

  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    throw createHttpError(400, 'Invalid targetId');
  }

  if (!userId) {
    throw createHttpError(401, 'User not authenticated');
  }

  const TargetModel = TARGET_MAP[targetType];

  const targetExists = await TargetModel.exists({ _id: targetId });
  if (!targetExists) {
    throw createHttpError(404, `${targetType} not found`);
  }

  const existing = await Favorite.findOne({
    userId,
    targetType,
    targetId,
  });

  if (existing) {
    await Favorite.deleteOne({ _id: existing._id });
    return { favorited: false };
  }

  await Favorite.create({
    userId,
    targetType,
    targetId,
  });

  return { favorited: true };
};

export const getMyFavoritesController = async (req, res, next) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return next(createHttpError(401, 'User not authenticated'));

    const targetType = req.query.type || 'post';
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Number(req.query.limit || 20));
    const skip = (page - 1) * limit;

    const favDocs = await Favorite.find({ userId, targetType })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const ids = favDocs.map((f) => String(f.targetId));
    if (targetType === 'post') {
      const posts = await PostCollection.find({ _id: { $in: ids } })
        .populate('author', 'name surname photo')
        .lean();

      const postsById = new Map(posts.map((p) => [String(p._id), p]));
      const ordered = ids.map((id) => postsById.get(id)).filter(Boolean);

      return res.json({
        status: 200,
        data: ordered,
        page,
        limit,
      });
    } else {
      return res.json({ status: 200, data: [], page, limit });
    }
  } catch (err) {
    next(err);
  }
};
