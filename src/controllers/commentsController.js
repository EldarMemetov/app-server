import createHttpError from 'http-errors';
import mongoose from 'mongoose';
import Comment from '../db/models/Comment.js';
import PostCollection from '../db/models/Post.js';
import UserCollection from '../db/models/User.js';
import LikeCollection from '../db/models/like.js';
import { createNotification } from '../utils/notifications.js';
const getCommentIdFromParams = (params) =>
  params.commentId || params.id || null;

const getPostIdFromParams = (params) => params.id || params.postId || null;

// export const addCommentController = async (req, res, next) => {
//   try {
//     const postId = getPostIdFromParams(req.params);
//     const userId = req.user && req.user._id;
//     const rawText = req.body?.text;
//     const parentComment = req.body?.parentComment ?? null;
//     const replyTo = req.body?.replyTo ?? null;

//     if (!userId) return next(createHttpError(401, 'User not authenticated'));
//     if (!postId || !mongoose.Types.ObjectId.isValid(postId))
//       return next(createHttpError(400, 'Invalid post id'));

//     const text = typeof rawText === 'string' ? rawText.trim() : '';
//     if (!text) return next(createHttpError(400, 'Comment text is required'));

//     const postExists = await PostCollection.exists({ _id: postId });
//     if (!postExists) return next(createHttpError(404, 'Post not found'));

//     let parent = null;
//     if (parentComment) {
//       if (!mongoose.Types.ObjectId.isValid(parentComment))
//         return next(createHttpError(400, 'Invalid parentComment id'));
//       parent = await Comment.findById(parentComment).select('postId').lean();
//       if (!parent)
//         return next(createHttpError(404, 'Parent comment not found'));
//       if (String(parent.postId) !== String(postId))
//         return next(
//           createHttpError(400, 'Parent comment belongs to another post'),
//         );
//     }

//     if (replyTo) {
//       if (!mongoose.Types.ObjectId.isValid(replyTo))
//         return next(createHttpError(400, 'Invalid replyTo id'));
//       const u = await UserCollection.findById(replyTo).select('_id').lean();
//       if (!u) return next(createHttpError(404, 'Reply-to user not found'));
//     }

//     const createData = {
//       postId,
//       author: userId,
//       text,
//       parentComment: parentComment || null,
//       replyTo: replyTo || null,
//     };

//     const doc = await Comment.create(createData);

//     const populated = await Comment.findById(doc._id)
//       .populate('author', 'name surname photo role')
//       .populate('replyTo', 'name surname photo')
//       .lean();

//     try {
//       const io = req.app?.get('io');
//       if (io) {
//         io.to(`post:${String(postId)}`).emit('comment:new', {
//           postId: String(postId),
//           comment: populated,
//         });
//       }
//     } catch (e) {
//       console.error('comment emit error (new):', e);
//     }

//     res.status(201).json({
//       status: 201,
//       message: 'Comment added successfully',
//       data: populated,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

export const addCommentController = async (req, res, next) => {
  try {
    const postId = getPostIdFromParams(req.params);
    const userId = req.user && req.user._id;
    const rawText = req.body?.text;
    const parentComment = req.body?.parentComment ?? null;
    const replyTo = req.body?.replyTo ?? null;

    if (!userId) return next(createHttpError(401, 'User not authenticated'));
    if (!postId || !mongoose.Types.ObjectId.isValid(postId))
      return next(createHttpError(400, 'Invalid post id'));

    const text = typeof rawText === 'string' ? rawText.trim() : '';
    if (!text) return next(createHttpError(400, 'Comment text is required'));

    const postExists = await PostCollection.exists({ _id: postId });
    if (!postExists) return next(createHttpError(404, 'Post not found'));

    let parent = null;
    if (parentComment) {
      if (!mongoose.Types.ObjectId.isValid(parentComment))
        return next(createHttpError(400, 'Invalid parentComment id'));

      parent = await Comment.findById(parentComment)
        .select('postId author')
        .lean();

      if (!parent)
        return next(createHttpError(404, 'Parent comment not found'));

      if (String(parent.postId) !== String(postId))
        return next(
          createHttpError(400, 'Parent comment belongs to another post'),
        );
    }

    if (replyTo) {
      if (!mongoose.Types.ObjectId.isValid(replyTo))
        return next(createHttpError(400, 'Invalid replyTo id'));

      const u = await UserCollection.findById(replyTo).select('_id').lean();
      if (!u) return next(createHttpError(404, 'Reply-to user not found'));
    }

    const doc = await Comment.create({
      postId,
      author: userId,
      text,
      parentComment: parentComment || null,
      replyTo: replyTo || null,
    });

    const populated = await Comment.findById(doc._id)
      .populate('author', 'name surname photo role')
      .populate('replyTo', 'name surname photo')
      .lean();

    // 🔔 уведомление автору комментария, если это ответ
    if (parent && String(parent.author) !== String(userId)) {
      await createNotification({
        user: parent.author,
        fromUser: userId,
        type: 'comment',
        key: `reply_comment_${doc._id}`,
        title: `${req.user.name} replied to your comment`,
        message: text,
        meta: {
          postId: String(postId),
          commentId: String(doc._id),
          fromUserId: String(userId),
        },
        unique: true,
        uniqueMetaKeys: ['commentId'],
      });
    }

    try {
      const io = req.app?.get('io');
      if (io) {
        io.to(`post:${String(postId)}`).emit('comment:new', {
          postId: String(postId),
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
    const postId = getPostIdFromParams(req.params);
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Number(req.query.limit || 20));
    const skip = (page - 1) * limit;

    if (!postId || !mongoose.Types.ObjectId.isValid(postId))
      return next(createHttpError(400, 'Invalid post id'));

    const query = { postId, deleted: false };

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
    if (maybeUserId && Array.isArray(items) && items.length > 0) {
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
        io.to(`post:${String(comment.postId)}`).emit('comment:updated', {
          postId: String(comment.postId),
          comment: populated,
        });
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

    const post = await PostCollection.findById(comment.postId)
      .select('author')
      .lean();
    const isPostAuthor = post && String(post.author) === String(userId);
    const isCommentAuthor = String(comment.author) === String(userId);

    if (!isCommentAuthor && !isPostAuthor && req.user.role !== 'admin') {
      return next(
        createHttpError(
          403,
          'You can delete only your comments or comments on your posts',
        ),
      );
    }

    comment.deleted = true;
    await comment.save();

    try {
      const io = req.app?.get('io');
      if (io) {
        io.to(`post:${String(comment.postId)}`).emit('comment:deleted', {
          postId: String(comment.postId),
          commentId: String(comment._id),
        });
      }
    } catch (e) {
      console.error('comment emit error (deleted):', e);
    }

    res.json({ status: 200, message: 'Comment deleted successfully' });
  } catch (err) {
    next(err);
  }
};
