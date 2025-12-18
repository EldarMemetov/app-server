// contacts/likesController.js
import createHttpError from 'http-errors';
import * as likesService from './likes.js';
import { getSocketForUser } from '../socket/socketUtils.js';

export const likeUserController = async (req, res) => {
  const fromUserId = req.user._id;
  const toUserId = req.params.id;

  try {
    const userSocket = getSocketForUser(toUserId);
    await likesService.likeUser(fromUserId, toUserId, userSocket);
    const likesCount = await likesService.getLikesCount(toUserId);

    res.status(200).json({
      status: 200,
      message: 'Profile liked',
      data: { liked: true, likesCount },
    });
  } catch (err) {
    if (err.status) throw err;
    throw createHttpError(500, err.message);
  }
};

export const unlikeUserController = async (req, res) => {
  const fromUserId = req.user._id;
  const toUserId = req.params.id;

  const userSocket = getSocketForUser(toUserId);
  await likesService.unlikeUser(fromUserId, toUserId, userSocket);

  const likesCount = await likesService.getLikesCount(toUserId);
  res.status(200).json({
    status: 200,
    message: 'Like removed',
    data: { liked: false, likesCount },
  });
};

export const getLikeStatusController = async (req, res) => {
  const maybeUser = req.user;
  const fromUserId = maybeUser ? maybeUser._id : null;
  const toUserId = req.params.id;

  const liked = fromUserId
    ? await likesService.isLikedBy(fromUserId, toUserId)
    : false;
  const likesCount = await likesService.getLikesCount(toUserId);

  res.json({
    status: 200,
    message: 'Like status fetched',
    data: { liked, likesCount },
  });
};
