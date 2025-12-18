// contacts/likesController.js
import createHttpError from 'http-errors';
import * as likesService from './likes.js';

export const likeUserController = async (req, res, next) => {
  const fromUserId = req.user._id;
  const toUserId = req.params.id;
  const io = req.app.get('io');

  try {
    await likesService.likeUser(fromUserId, toUserId, io);
    const likesCount = await likesService.getLikesCount(toUserId);

    res.status(200).json({
      status: 200,
      message: 'Profile liked',
      data: { liked: true, likesCount },
    });
  } catch (err) {
    console.error('likeUserController error', err);
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    return next(createHttpError(500, err.message || 'Internal server error'));
  }
};

export const unlikeUserController = async (req, res, next) => {
  const fromUserId = req.user._id;
  const toUserId = req.params.id;
  const io = req.app.get('io');

  try {
    await likesService.unlikeUser(fromUserId, toUserId, io);
    const likesCount = await likesService.getLikesCount(toUserId);

    res.status(200).json({
      status: 200,
      message: 'Like removed',
      data: { liked: false, likesCount },
    });
  } catch (err) {
    console.error('unlikeUserController error', err);
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    return next(createHttpError(500, err.message || 'Internal server error'));
  }
};
