// contacts/likes.js
import LikeCollection from '../db/models/like.js';
import UserCollection from '../db/models/User.js';
import createHttpError from 'http-errors';

export const likeUser = async (fromUserId, toUserId, socket = null) => {
  if (fromUserId.toString() === toUserId.toString()) {
    throw createHttpError(400, 'Нельзя лайкать себя');
  }

  try {
    const likeDoc = await LikeCollection.create({ fromUserId, toUserId });

    await UserCollection.findByIdAndUpdate(toUserId, {
      $inc: { likesCount: 1 },
    });

    if (socket) {
      socket.emit('likeUpdate', { toUserId, liked: true });
    }

    return likeDoc;
  } catch (err) {
    if (err.code === 11000) {
      throw createHttpError(409, 'Уже лайкнуто');
    }
    throw err;
  }
};

export const unlikeUser = async (fromUserId, toUserId, socket = null) => {
  const deleted = await LikeCollection.findOneAndDelete({
    fromUserId,
    toUserId,
  });

  if (deleted) {
    await UserCollection.findByIdAndUpdate(toUserId, {
      $inc: { likesCount: -1 },
    });

    if (socket) {
      socket.emit('likeUpdate', { toUserId, liked: false });
    }
  }

  return !!deleted;
};

export const isLikedBy = async (fromUserId, toUserId) => {
  if (!fromUserId) return false;
  const doc = await LikeCollection.findOne({ fromUserId, toUserId });
  return !!doc;
};

export const getLikesCount = async (toUserId) => {
  const user = await UserCollection.findById(toUserId).select('likesCount');
  return user ? user.likesCount ?? 0 : 0;
};
