// contacts/likes.js
import LikeCollection from '../db/models/Like.js';
import UserCollection from '../db/models/User.js';
import createHttpError from 'http-errors';
import mongoose from 'mongoose';

export const getLikesCount = async (toUserId) => {
  const user = await UserCollection.findById(toUserId).select('likesCount');
  return user ? user.likesCount ?? 0 : 0;
};

export const isLikedBy = async (fromUserId, toUserId) => {
  if (!fromUserId) return false;
  const doc = await LikeCollection.findOne({ fromUserId, toUserId });
  return !!doc;
};

export const likeUser = async (fromUserId, toUserId, io = null) => {
  if (!mongoose.Types.ObjectId.isValid(toUserId)) {
    throw createHttpError(400, 'Invalid target id');
  }
  if (fromUserId.toString() === toUserId.toString()) {
    throw createHttpError(400, 'Нельзя лайкать себя');
  }

  try {
    const exists = await LikeCollection.findOne({ fromUserId, toUserId });

    if (exists) {
      const likesCount = await getLikesCount(toUserId);
      return { liked: true, likesCount };
    }

    await LikeCollection.create({ fromUserId, toUserId });

    await UserCollection.findByIdAndUpdate(toUserId, {
      $inc: { likesCount: 1 },
    });

    if (io?.userSockets) {
      const set = io.userSockets.get(String(toUserId));
      if (set) {
        for (const s of set) {
          s.emit('likeUpdate', { toUserId: String(toUserId), liked: true });
        }
      }
    }

    const likesCount = await getLikesCount(toUserId);
    return { liked: true, likesCount };
  } catch (err) {
    console.error('likeUser error', err);

    throw err;
  }
};

export const unlikeUser = async (fromUserId, toUserId, io = null) => {
  if (!mongoose.Types.ObjectId.isValid(toUserId)) {
    throw createHttpError(400, 'Invalid target id');
  }

  try {
    const deleted = await LikeCollection.findOneAndDelete({
      fromUserId,
      toUserId,
    });

    if (!deleted) {
      const likesCount = await getLikesCount(toUserId);
      return { removed: false, liked: false, likesCount };
    }

    await UserCollection.findByIdAndUpdate(toUserId, {
      $inc: { likesCount: -1 },
    });

    if (io?.userSockets) {
      const set = io.userSockets.get(String(toUserId));
      if (set) {
        for (const s of set) {
          s.emit('likeUpdate', { toUserId: String(toUserId), liked: false });
        }
      }
    }

    const likesCount = await getLikesCount(toUserId);
    return { removed: true, liked: false, likesCount };
  } catch (err) {
    console.error('unlikeUser error', err);
    throw err;
  }
};
