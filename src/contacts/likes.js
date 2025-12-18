// contacts/likes.js
import LikeCollection from '../db/models/like.js';
import UserCollection from '../db/models/User.js';
import createHttpError from 'http-errors';
import mongoose from 'mongoose';

export const likeUser = async (fromUserId, toUserId, io = null) => {
  if (!mongoose.Types.ObjectId.isValid(toUserId)) {
    throw createHttpError(400, 'Invalid target id');
  }
  if (fromUserId.toString() === toUserId.toString()) {
    throw createHttpError(400, 'Нельзя лайкать себя');
  }

  try {
    const likeDoc = await LikeCollection.create({ fromUserId, toUserId });

    await UserCollection.findByIdAndUpdate(toUserId, {
      $inc: { likesCount: 1 },
    });

    // emit to sockets of target user (if io provided)
    if (io && io.userSockets) {
      const set = io.userSockets.get(String(toUserId));
      if (set) {
        for (const s of set) {
          s.emit('likeUpdate', { toUserId: String(toUserId), liked: true });
        }
      }
    }

    return likeDoc;
  } catch (err) {
    if (err.code === 11000) {
      throw createHttpError(409, 'Уже лайкнуто');
    }
    console.error('likeUser error', err);
    throw err;
  }
};

export const unlikeUser = async (fromUserId, toUserId, io = null) => {
  const deleted = await LikeCollection.findOneAndDelete({
    fromUserId,
    toUserId,
  });

  if (!deleted) {
    return false;
  }

  await UserCollection.findByIdAndUpdate(toUserId, {
    $inc: { likesCount: -1 },
  });

  if (io?.userSockets) {
    const sockets = io.userSockets.get(String(toUserId));
    if (sockets) {
      for (const s of sockets) {
        s.emit('likeUpdate', {
          toUserId: String(toUserId),
          liked: false,
        });
      }
    }
  }

  return true;
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
