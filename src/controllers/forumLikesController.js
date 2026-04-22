import createHttpError from 'http-errors';
import mongoose from 'mongoose';
import ForumTopic from '../db/models/ForumTopic.js';
import { toggleLike } from '../contacts/likesGeneric.js';

export const toggleTopicLikeController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fromUserId = req.user?._id;
    const io = req.app?.get('io');

    if (!fromUserId)
      return next(createHttpError(401, 'User not authenticated'));
    if (!mongoose.Types.ObjectId.isValid(id))
      return next(createHttpError(400, 'Invalid topic id'));

    const topic = await ForumTopic.findById(id).select('_id author').lean();
    if (!topic) return next(createHttpError(404, 'Topic not found'));

    const result = await toggleLike({
      fromUserId,
      targetType: 'forumTopic',
      targetId: id,
      io,
    });

    res.json({
      status: 200,
      message: result.liked ? 'Topic liked' : 'Like removed',
      data: { liked: result.liked, likesCount: result.likesCount ?? 0 },
    });
  } catch (err) {
    next(err);
  }
};
