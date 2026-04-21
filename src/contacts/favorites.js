import mongoose from 'mongoose';
import createHttpError from 'http-errors';
import Favorite from '../db/models/Favorite.js';
import PostCollection from '../db/models/Post.js';
import UserCollection from '../db/models/User.js';
import ForumTopicCollection from '../db/models/ForumTopic.js'; // ← добавить импорт

const TARGET_MAP = {
  post: PostCollection,
  user: UserCollection,
  forumTopic: ForumTopicCollection, // ← добавить в мапу
};

export const toggleFavorite = async ({ userId, targetType, targetId }) => {
  if (!['post', 'user', 'forumTopic'].includes(targetType)) {
    // ← + forumTopic
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
  if (!targetExists) throw createHttpError(404, `${targetType} not found`);

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
    if (err.code === 11000) return { favorited: true };
    throw err;
  }
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
      const byId = new Map(posts.map((p) => [String(p._id), p]));
      const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
      return res.json({ status: 200, data: ordered, page, limit });
    }

    if (targetType === 'forumTopic') {
      // ← новая ветка
      const topics = await ForumTopicCollection.find({ _id: { $in: ids } })
        .populate('author', 'name surname photo')
        .lean();
      const byId = new Map(topics.map((t) => [String(t._id), t]));
      const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
      return res.json({ status: 200, data: ordered, page, limit });
    }

    if (targetType === 'user') {
      // ← сразу заодно закроем
      const users = await UserCollection.find({ _id: { $in: ids } })
        .select('-password')
        .lean();
      const byId = new Map(users.map((u) => [String(u._id), u]));
      const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
      return res.json({ status: 200, data: ordered, page, limit });
    }

    return res.json({ status: 200, data: [], page, limit });
  } catch (err) {
    next(err);
  }
};
