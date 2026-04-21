import createHttpError from 'http-errors';
import mongoose from 'mongoose';
import Comment from '../db/models/Comment.js';
import PostCollection from '../db/models/Post.js';
import ForumTopicCollection from '../db/models/ForumTopic.js';
import UserCollection from '../db/models/User.js';
import LikeCollection from '../db/models/like.js';
import { NotificationService } from '../utils/notificationService.js';

const getCommentIdFromParams = (params) =>
  params.commentId || params.id || null;

// Определяем target по роуту: /posts/:id/... или /forum/:id/...
const getTargetFromReq = (req) => {
  const targetId = req.params.id || req.params.postId || req.params.topicId;
  const isForum = (req.baseUrl || req.originalUrl || '').includes('/forum');
  return { targetType: isForum ? 'forumTopic' : 'post', targetId };
};

const TARGET_MODELS = {
  post: PostCollection,
  forumTopic: ForumTopicCollection,
};

export const addCommentController = async (req, res, next) => {
  try {
    const { targetType, targetId } = getTargetFromReq(req);
    const userId = req.user && req.user._id;
    const rawText = req.body?.text;
    const parentComment = req.body?.parentComment ?? null;
    const replyTo = req.body?.replyTo ?? null;

    if (!userId) return next(createHttpError(401, 'User not authenticated'));
    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId))
      return next(createHttpError(400, `Invalid ${targetType} id`));

    const text = typeof rawText === 'string' ? rawText.trim() : '';
    if (!text) return next(createHttpError(400, 'Comment text is required'));

    const TargetModel = TARGET_MODELS[targetType];
    const targetExists = await TargetModel.exists({ _id: targetId });
    if (!targetExists)
      return next(createHttpError(404, `${targetType} not found`));

    let parent = null;
    if (parentComment) {
      if (!mongoose.Types.ObjectId.isValid(parentComment))
        return next(createHttpError(400, 'Invalid parentComment id'));

      parent = await Comment.findById(parentComment)
        .select('targetType targetId author')
        .lean();

      if (!parent)
        return next(createHttpError(404, 'Parent comment not found'));

      if (
        String(parent.targetId) !== String(targetId) ||
        parent.targetType !== targetType
      )
        return next(
          createHttpError(400, 'Parent comment belongs to another target'),
        );
    }

    if (replyTo) {
      if (!mongoose.Types.ObjectId.isValid(replyTo))
        return next(createHttpError(400, 'Invalid replyTo id'));
      const u = await UserCollection.findById(replyTo).select('_id').lean();
      if (!u) return next(createHttpError(404, 'Reply-to user not found'));
    }

    const doc = await Comment.create({
      targetType,
      targetId,
      author: userId,
      text,
      parentComment: parentComment || null,
      replyTo: replyTo || null,
    });

    // Инкрементим commentsCount у таргета (если поле есть)
    await TargetModel.findByIdAndUpdate(targetId, {
      $inc: { commentsCount: 1 },
    });

    const populated = await Comment.findById(doc._id)
      .populate('author', 'name surname photo role')
      .populate('replyTo', 'name surname photo')
      .lean();

    if (parent) {
      await NotificationService.replyToComment({
        fromUserId: userId,
        parentComment: parent,
        text,
        postId: targetType === 'post' ? targetId : null,
        // можешь расширить NotificationService полями targetType/targetId
      });
    }

    try {
      const io = req.app?.get('io');
      if (io) {
        io.to(`${targetType}:${String(targetId)}`).emit('comment:new', {
          targetType,
          targetId: String(targetId),
          comment: populated,
        });
      }
    } catch (e) {
      console.error('comment emit error (new):', e);
    }

    res.status(201).json({
      status: 201,
      message: 'Comment added successfully',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

export const getCommentsController = async (req, res, next) => {
  try {
    const { targetType, targetId } = getTargetFromReq(req);
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Number(req.query.limit || 20));
    const skip = (page - 1) * limit;

    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId))
      return next(createHttpError(400, `Invalid ${targetType} id`));

    const query = { targetType, targetId, deleted: false };

    const [items, total] = await Promise.all([
      Comment.find(query)
        .populate('author', 'name surname photo role')
        .populate('replyTo', 'name surname')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Comment.countDocuments(query),
    ]);

    const maybeUserId = req.user?._id;
    if (maybeUserId && items.length > 0) {
      const ids = items.map((c) => String(c._id));
      const likes = await LikeCollection.find({
        fromUserId: maybeUserId,
        targetType: 'comment',
        targetId: { $in: ids },
      })
        .select('targetId')
        .lean();
      const likedSet = new Set(likes.map((l) => String(l.targetId)));
      items.forEach((c) => {
        c.liked = likedSet.has(String(c._id));
      });
    } else {
      items.forEach((c) => {
        c.liked = false;
      });
    }

    res.json({
      status: 200,
      data: items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

export const updateCommentController = async (req, res, next) => {
  try {
    const commentId = getCommentIdFromParams(req.params);
    const userId = req.user && req.user._id;
    const rawText = req.body?.text;

    if (!userId) return next(createHttpError(401, 'User not authenticated'));
    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId))
      return next(createHttpError(400, 'Invalid comment id'));

    const text = typeof rawText === 'string' ? rawText.trim() : '';
    if (!text) return next(createHttpError(400, 'Comment text is required'));

    const comment = await Comment.findById(commentId);
    if (!comment) return next(createHttpError(404, 'Comment not found'));

    if (
      String(comment.author) !== String(userId) &&
      req.user.role !== 'admin'
    ) {
      return next(createHttpError(403, 'You can edit only your comments'));
    }

    comment.text = text;
    comment.updatedAt = new Date();
    await comment.save();

    const populated = await Comment.findById(comment._id)
      .populate('author', 'name surname photo role')
      .populate('replyTo', 'name surname photo')
      .lean();

    try {
      const io = req.app?.get('io');
      if (io) {
        io.to(`${comment.targetType}:${String(comment.targetId)}`).emit(
          'comment:updated',
          {
            targetType: comment.targetType,
            targetId: String(comment.targetId),
            comment: populated,
          },
        );
      }
    } catch (e) {
      console.error('comment emit error (updated):', e);
    }

    res.json({
      status: 200,
      message: 'Comment updated successfully',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCommentController = async (req, res, next) => {
  try {
    const commentId = getCommentIdFromParams(req.params);
    const userId = req.user && req.user._id;

    if (!userId) return next(createHttpError(401, 'User not authenticated'));
    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId))
      return next(createHttpError(400, 'Invalid comment id'));

    const comment = await Comment.findById(commentId);
    if (!comment) return next(createHttpError(404, 'Comment not found'));

    // Автор цели тоже может удалить коммент у себя
    let isTargetAuthor = false;
    if (comment.targetType === 'post') {
      const post = await PostCollection.findById(comment.targetId)
        .select('author')
        .lean();
      isTargetAuthor = post && String(post.author) === String(userId);
    } else if (comment.targetType === 'forumTopic') {
      const topic = await ForumTopicCollection.findById(comment.targetId)
        .select('author')
        .lean();
      isTargetAuthor = topic && String(topic.author) === String(userId);
    }
    const isCommentAuthor = String(comment.author) === String(userId);

    if (!isCommentAuthor && !isTargetAuthor && req.user.role !== 'admin') {
      return next(createHttpError(403, 'Not allowed'));
    }

    comment.deleted = true;
    await comment.save();

    try {
      const io = req.app?.get('io');
      if (io) {
        io.to(`${comment.targetType}:${String(comment.targetId)}`).emit(
          'comment:deleted',
          {
            targetType: comment.targetType,
            targetId: String(comment.targetId),
            commentId: String(comment._id),
          },
        );
      }
    } catch (e) {
      console.error('comment emit error (deleted):', e);
    }

    res.json({ status: 200, message: 'Comment deleted successfully' });
  } catch (err) {
    next(err);
  }
};
