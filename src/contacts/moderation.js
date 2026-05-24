import mongoose from 'mongoose';
import createHttpError from 'http-errors';

import UserCollection from '../db/models/User.js';
import PostCollection from '../db/models/Post.js';
import CommentCollection from '../db/models/Comment.js';
import ForumTopicCollection from '../db/models/ForumTopic.js';
import ApplicationCollection from '../db/models/Application.js';
import ReviewCollection from '../db/models/Review.js';
import ProjectResultCollection from '../db/models/ProjectResult.js';
import FavoriteCollection from '../db/models/Favorite.js';
import LikeCollection from '../db/models/like.js';
import SessionCollection from '../db/models/Session.js';

/* ============================================================
   USERS
============================================================ */

export const getAllUsers = async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Number(req.query.limit || 50));
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.isBlocked === 'true') filter.isBlocked = true;
  if (req.query.isBlocked === 'false') filter.isBlocked = false;
  if (req.query.accessRole) filter.accessRole = req.query.accessRole;
  if (req.query.q) {
    const rx = new RegExp(String(req.query.q).trim(), 'i');
    filter.$or = [{ name: rx }, { surname: rx }, { email: rx }];
  }

  const [items, total] = await Promise.all([
    UserCollection.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    UserCollection.countDocuments(filter),
  ]);

  res.json({
    status: 200,
    message: 'All users fetched',
    data: items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
};

export const blockUser = async (req, res) => {
  const target = await UserCollection.findById(req.params.id);
  if (!target) throw createHttpError(404, 'User not found');

  if (target.accessRole === 'admin') {
    throw createHttpError(403, 'Cannot block an admin');
  }
  if (String(target._id) === String(req.user._id)) {
    throw createHttpError(403, 'Cannot block yourself');
  }

  target.isBlocked = true;
  await target.save();

  // Инвалидируем все активные сессии заблокированного пользователя
  await SessionCollection.deleteMany({ userId: target._id });

  // Опционально — выкинуть его сокеты, если ты раздаёшь комнату по userId
  try {
    const io = req.app.get('io');
    io?.to(`user:${String(target._id)}`).disconnectSockets(true);
  } catch (e) {
    console.error('blockUser disconnectSockets error:', e);
  }

  const safe = target.toObject();
  delete safe.password;
  res.json({ status: 200, message: 'User blocked', data: safe });
};

export const unblockUser = async (req, res) => {
  const user = await UserCollection.findByIdAndUpdate(
    req.params.id,
    { isBlocked: false },
    { new: true },
  ).select('-password');
  if (!user) throw createHttpError(404, 'User not found');
  res.json({ status: 200, message: 'User unblocked', data: user });
};

// Только админ может менять роль (смотри роутер)
export const changeUserRole = async (req, res) => {
  const { role } = req.body || {};
  if (!['user', 'moderator', 'admin'].includes(role)) {
    throw createHttpError(
      400,
      'Invalid role. Allowed: user | moderator | admin',
    );
  }

  const target = await UserCollection.findById(req.params.id);
  if (!target) throw createHttpError(404, 'User not found');

  if (String(target._id) === String(req.user._id) && role !== 'admin') {
    throw createHttpError(403, 'You cannot demote yourself');
  }

  target.accessRole = role;
  await target.save();

  const safe = target.toObject();
  delete safe.password;
  res.json({ status: 200, message: 'Role updated', data: safe });
};

export const getAllPosts = async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Number(req.query.limit || 20));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    PostCollection.find()
      .populate('author', 'name surname email photo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    PostCollection.countDocuments(),
  ]);

  res.json({
    status: 200,
    message: 'All posts fetched',
    data: items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
};

export const deletePost = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw createHttpError(400, 'Invalid post id');
  }

  const post = await PostCollection.findById(id);
  if (!post) throw createHttpError(404, 'Post not found');

  // Заранее берём id всех комментов поста, чтобы потом снести их лайки
  const commentIds = await CommentCollection.find({
    targetType: 'post',
    targetId: id,
  }).distinct('_id');

  await Promise.all([
    PostCollection.deleteOne({ _id: id }),
    CommentCollection.deleteMany({ targetType: 'post', targetId: id }),
    ApplicationCollection.deleteMany({ post: id }),
    ReviewCollection.deleteMany({ post: id }),
    ProjectResultCollection.deleteMany({ post: id }),
    FavoriteCollection.deleteMany({ targetType: 'post', targetId: id }),
    LikeCollection.deleteMany({ targetType: 'post', targetId: id }),
    LikeCollection.deleteMany({
      targetType: 'comment',
      targetId: { $in: commentIds },
    }),
  ]);

  const io = req.app.get('io');
  io?.emit('post:deleted', { postId: id });

  res.json({ status: 200, message: 'Post deleted successfully' });
};

export const deleteComment = async (req, res) => {
  const { commentId } = req.params;
  if (!mongoose.isValidObjectId(commentId)) {
    throw createHttpError(400, 'Invalid comment id');
  }

  const comment = await CommentCollection.findById(commentId);
  if (!comment) throw createHttpError(404, 'Comment not found');
  if (comment.deleted) {
    return res.json({ status: 200, message: 'Already deleted' });
  }

  comment.deleted = true;
  comment.status = 'hidden';
  comment.text = '[deleted by moderator]';
  await comment.save();

  const TargetModel =
    comment.targetType === 'forumTopic' ? ForumTopicCollection : PostCollection;

  await TargetModel.findByIdAndUpdate(comment.targetId, {
    $inc: { commentsCount: -1 },
  });

  const io = req.app.get('io');
  io?.to(`${comment.targetType}:${String(comment.targetId)}`).emit(
    'comment:deleted',
    {
      targetType: comment.targetType,
      targetId: String(comment.targetId),
      commentId: String(comment._id),
      byModerator: true,
    },
  );

  res.json({ status: 200, message: 'Comment deleted', data: comment });
};

export const hardDeleteComment = async (req, res) => {
  const { commentId } = req.params;
  if (!mongoose.isValidObjectId(commentId)) {
    throw createHttpError(400, 'Invalid comment id');
  }

  const comment = await CommentCollection.findById(commentId);
  if (!comment) throw createHttpError(404, 'Comment not found');

  // Удаляем ТОЛЬКО этот один комментарий.
  // Ответы (replies) НЕ трогаем — они остаются.
  await CommentCollection.deleteOne({ _id: commentId });
  await LikeCollection.deleteMany({
    targetType: 'comment',
    targetId: commentId,
  });

  // Если коммент был "живой" — уменьшаем счётчик у таргета.
  if (!comment.deleted) {
    const TargetModel =
      comment.targetType === 'forumTopic'
        ? ForumTopicCollection
        : PostCollection;
    await TargetModel.findByIdAndUpdate(comment.targetId, {
      $inc: { commentsCount: -1 },
    });
  }

  const io = req.app.get('io');
  io?.to(`${comment.targetType}:${String(comment.targetId)}`).emit(
    'comment:deleted',
    {
      targetType: comment.targetType,
      targetId: String(comment.targetId),
      commentId: String(comment._id),
      byModerator: true,
      hard: true,
    },
  );

  res.json({ status: 200, message: 'Comment hard-deleted' });
};

/* ============================================================
   FORUM TOPICS
============================================================ */

export const getAllForumTopics = async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Number(req.query.limit || 20));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    ForumTopicCollection.find()
      .populate('author', 'name surname email photo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ForumTopicCollection.countDocuments(),
  ]);

  res.json({
    status: 200,
    message: 'All forum topics fetched',
    data: items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
};

// SOFT — модератор может скрыть тему (помечает deleted=true),
// все комменты помечаются deleted=true. Эмитим событие фронту.
export const softDeleteForumTopic = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw createHttpError(400, 'Invalid topic id');
  }

  const topic = await ForumTopicCollection.findById(id);
  if (!topic) throw createHttpError(404, 'Forum topic not found');
  if (topic.deleted) {
    return res.json({ status: 200, message: 'Already deleted' });
  }

  topic.deleted = true;
  await topic.save();

  await CommentCollection.updateMany(
    { targetType: 'forumTopic', targetId: topic._id },
    { $set: { deleted: true } },
  );

  const io = req.app.get('io');
  io?.emit('forumTopic:deleted', { topicId: String(topic._id) });

  res.json({ status: 200, message: 'Forum topic deleted (soft)' });
};

// HARD — только админ. Физически сносит тему + комменты + лайки + избранные.
export const hardDeleteForumTopic = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw createHttpError(400, 'Invalid topic id');
  }

  const topic = await ForumTopicCollection.findById(id);
  if (!topic) throw createHttpError(404, 'Forum topic not found');

  const commentIds = await CommentCollection.find({
    targetType: 'forumTopic',
    targetId: id,
  }).distinct('_id');

  await Promise.all([
    ForumTopicCollection.deleteOne({ _id: id }),
    CommentCollection.deleteMany({ targetType: 'forumTopic', targetId: id }),
    FavoriteCollection.deleteMany({ targetType: 'forumTopic', targetId: id }),
    LikeCollection.deleteMany({ targetType: 'forumTopic', targetId: id }),
    LikeCollection.deleteMany({
      targetType: 'comment',
      targetId: { $in: commentIds },
    }),
  ]);

  const io = req.app.get('io');
  io?.emit('forumTopic:deleted', { topicId: id });

  res.json({ status: 200, message: 'Forum topic deleted (hard)' });
};
