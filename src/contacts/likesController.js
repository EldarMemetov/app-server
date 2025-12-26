// contacts/likesController.js
import createHttpError from 'http-errors';
import * as likesService from './likes.js';
import mongoose from 'mongoose';
import { toggleLike } from './likesGeneric.js';
import LikeCollection from '../db/models/like.js';
import PostCollection from '../db/models/Post.js';
export const likeUserController = async (req, res, next) => {
  const fromUserId = req.user && req.user._id;
  const toUserId = req.params.id;
  const io = req.app.get('io');

  if (!fromUserId) return next(createHttpError(401, 'User not authenticated'));

  try {
    const result = await likesService.likeUser(fromUserId, toUserId, io);

    res.status(200).json({
      status: 200,
      message: 'Profile liked',
      data: { liked: !!result.liked, likesCount: result.likesCount ?? 0 },
    });
  } catch (err) {
    console.error('likeUserController error', err);
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    return next(createHttpError(500, err.message || 'Internal server error'));
  }
};

export const unlikeUserController = async (req, res, next) => {
  const fromUserId = req.user && req.user._id;
  const toUserId = req.params.id;
  const io = req.app.get('io');

  if (!fromUserId) return next(createHttpError(401, 'User not authenticated'));

  try {
    const result = await likesService.unlikeUser(fromUserId, toUserId, io);

    res.status(200).json({
      status: 200,
      message: result.removed ? 'Like removed' : 'Like already removed',
      data: { liked: false, likesCount: result.likesCount ?? 0 },
    });
  } catch (err) {
    console.error('unlikeUserController error', err);
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    return next(createHttpError(500, err.message || 'Internal server error'));
  }
};

export const getLikeStatusController = async (req, res, next) => {
  const maybeUser = req.user;
  const fromUserId = maybeUser ? maybeUser._id : null;
  const toUserId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(toUserId)) {
    return next(createHttpError(400, 'Invalid user id'));
  }

  try {
    const liked = fromUserId
      ? await likesService.isLikedBy(fromUserId, toUserId)
      : false;

    const likesCount = await likesService.getLikesCount(toUserId);

    res.json({
      status: 200,
      message: 'Like status fetched',
      data: { liked, likesCount },
    });
  } catch (err) {
    console.error('getLikeStatusController error', err);
    return next(createHttpError(500, err.message || 'Internal server error'));
  }
};

export const getPostLikeStatusController = async (req, res, next) => {
  const maybeUser = req.user;
  const fromUserId = maybeUser ? maybeUser._id : null;
  const postId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return next(createHttpError(400, 'Invalid post id'));
  }

  const post = await PostCollection.findById(postId)
    .select('likesCount')
    .lean();
  if (!post) return next(createHttpError(404, 'Post not found'));

  try {
    const liked = fromUserId
      ? Boolean(
          await LikeCollection.findOne({
            fromUserId,
            targetType: 'post',
            targetId: postId,
          }),
        )
      : false;

    const likesCount =
      typeof post.likesCount === 'number'
        ? post.likesCount
        : await LikeCollection.countDocuments({
            targetType: 'post',
            targetId: postId,
          });

    res.json({
      status: 200,
      message: 'Post like status fetched',
      data: { liked, likesCount },
    });
  } catch (err) {
    return next(err);
  }
};

export const toggleLikeController = async (req, res, next) => {
  const { id } = req.params;
  const fromUserId =
    req.user && req.user._1d ? req.user._1d : req.user && req.user._id;
  const io = req.app.get('io');

  if (!fromUserId) return next(createHttpError(401, 'User not authenticated'));

  try {
    const result = await toggleLike({
      fromUserId,
      targetType: 'post',
      targetId: id,
      io,
    });

    res.json({
      status: 200,
      message: result.liked ? 'Post liked' : 'Like removed',
      data: { liked: result.liked, likesCount: result.likesCount ?? 0 },
    });
  } catch (err) {
    return next(err);
  }
};
