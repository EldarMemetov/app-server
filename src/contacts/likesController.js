// contacts/likesController.js
import createHttpError from 'http-errors';
import * as likesService from './likes.js';
import mongoose from 'mongoose';
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

// export const getLikeStatusController = async (req, res, next) => {
//   const maybeUser = req.user;
//   const fromUserId = maybeUser ? maybeUser._id : null;
//   const toUserId = req.params.id;

//   try {
//     const liked = fromUserId
//       ? await likesService.isLikedBy(fromUserId, toUserId)
//       : false;
//     const likesCount = await likesService.getLikesCount(toUserId);

//     res.json({
//       status: 200,
//       message: 'Like status fetched',
//       data: { liked, likesCount },
//     });
//   } catch (err) {
//     console.error('getLikeStatusController error', err);

//     if (
//       err.name === 'CastError' ||
//       err.message?.includes('Invalid target id')
//     ) {
//       return next(createHttpError(400, 'Invalid user id'));
//     }
//     return next(createHttpError(500, err.message || 'Internal server error'));
//   }
// };
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
