import * as likesService from './likes.js';
import { initSocket } from '../socket/socket.js';

export const likeUserController = async (req, res) => {
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
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const unlikeUserController = async (req, res) => {
  const fromUserId = req.user._id;
  const toUserId = req.params.id;

  const userSocket = initSocket(toUserId);
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
