import createHttpError from 'http-errors';
import mongoose from 'mongoose';
import Comment from '../db/models/Comment.js';
import { toggleLike } from '../contacts/likesGeneric.js';

export const toggleCommentLikeController = async (req, res, next) => {
  try {
    const commentId = req.params.commentId || req.params.id;
    const fromUserId = req.user && req.user._id;
    const io = req.app?.get('io');

    if (!fromUserId)
      return next(createHttpError(401, 'User not authenticated'));
    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId))
      return next(createHttpError(400, 'Invalid comment id'));

    const comment = await Comment.findById(commentId).select('postId').lean();
    if (!comment) return next(createHttpError(404, 'Comment not found'));

    const result = await toggleLike({
      fromUserId,
      targetType: 'comment',
      targetId: commentId,
      io,
    });

    try {
      if (io && comment.postId) {
        io.to(`post:${String(comment.postId)}`).emit('comment:like', {
          commentId: String(commentId),
          liked: result.liked,
          likesCount: result.likesCount ?? 0,
          byUserId: String(fromUserId),
        });
      }
    } catch (e) {
      console.error('emit comment:like error', e);
    }

    res.json({
      status: 200,
      message: result.liked ? 'Comment liked' : 'Like removed',
      data: { liked: result.liked, likesCount: result.likesCount ?? 0 },
    });
  } catch (err) {
    next(err);
  }
};
