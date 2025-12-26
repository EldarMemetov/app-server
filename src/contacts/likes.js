import LikeCollection from '../db/models/like.js';
import UserCollection from '../db/models/User.js';
import createHttpError from 'http-errors';
import mongoose from 'mongoose';
import { createNotification } from '../utils/notifications.js';

export const getLikesCount = async (toUserId) => {
  if (!mongoose.Types.ObjectId.isValid(toUserId)) return 0;
  const user = await UserCollection.findById(toUserId).select('likesCount');
  return user ? user.likesCount ?? 0 : 0;
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

      if (io?.userSockets) {
        const payload = { toUserId: String(toUserId), liked: true, likesCount };
        const set = io.userSockets.get(String(toUserId));
        if (set) for (const s of set) s.emit('likeUpdate', payload);

        io.emit('likeUpdate', payload);
      }
      return { liked: true, likesCount };
    }

    try {
      await LikeCollection.create({ fromUserId, toUserId });
    } catch (err) {
      if (err?.code === 11000) {
        const likesCount = await getLikesCount(toUserId);
        if (io?.userSockets) {
          const payload = {
            toUserId: String(toUserId),
            liked: true,
            likesCount,
          };
          const set = io.userSockets.get(String(toUserId));
          if (set) for (const s of set) s.emit('likeUpdate', payload);
          io.emit('likeUpdate', payload);
        }
        return { liked: true, likesCount };
      }
      throw err;
    }

    const updatedUser = await UserCollection.findByIdAndUpdate(
      toUserId,
      { $inc: { likesCount: 1 } },
      { new: true },
    );

    const likesCount =
      updatedUser?.likesCount ?? (await getLikesCount(toUserId));

    let fromUserInfo = null;
    try {
      fromUserInfo = await UserCollection.findById(fromUserId).select(
        'name surname photo',
      );
    } catch (e) {
      console.log(e);
    }

    let notifDoc = null;
    try {
      notifDoc = await createNotification({
        user: toUserId,
        fromUser: fromUserId,
        type: 'like',
        key: `liked_by_${String(fromUserId)}_${String(toUserId)}_${Date.now()}`,
        title: `${fromUserInfo?.name || 'User'} liked your profile`,
        message: `${fromUserInfo?.name || ''} ${
          fromUserInfo?.surname || ''
        }`.trim(),
        meta: {
          fromUserId: String(fromUserId),
          fromName: fromUserInfo?.name || '',
          fromSurname: fromUserInfo?.surname || '',
          fromPhoto: fromUserInfo?.photo || null,
          profileUrl: `/talents/${String(fromUserId)}`,
        },
        unique: false,
      });
    } catch (e) {
      console.error('createNotification error (like):', e);
    }

    if (io?.userSockets) {
      const likePayload = {
        toUserId: String(toUserId),
        liked: true,
        likesCount,
      };
      const set = io.userSockets.get(String(toUserId));
      if (set) {
        for (const s of set) s.emit('likeUpdate', likePayload);
      }

      io.emit('likeUpdate', likePayload);

      const notificationPayload = notifDoc
        ? notifDoc
        : {
            user: String(toUserId),
            fromUser: String(fromUserId),
            title: `${fromUserInfo?.name || 'User'} liked your profile`,
            message: `${fromUserInfo?.name || ''} ${
              fromUserInfo?.surname || ''
            }`.trim(),
            meta: {
              profileUrl: `/talents/${String(fromUserId)}`,
              fromUserId: String(fromUserId),
              fromName: fromUserInfo?.name || '',
              fromSurname: fromUserInfo?.surname || '',
            },
            createdAt: new Date().toISOString(),
          };

      if (set) {
        for (const s of set) s.emit('notification:new', notificationPayload);
      }
    }

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
      if (io?.userSockets) {
        const set = io.userSockets.get(String(toUserId));
        if (set) {
          for (const s of set) {
            s.emit('likeUpdate', {
              toUserId: String(toUserId),
              liked: false,
              likesCount,
            });
          }
        }
        io.emit('likeUpdate', {
          toUserId: String(toUserId),
          liked: false,
          likesCount,
        });
      }
      return { removed: false, liked: false, likesCount };
    }

    const updatedUser = await UserCollection.findByIdAndUpdate(
      toUserId,
      { $inc: { likesCount: -1 } },
      { new: true },
    );

    const likesCount =
      updatedUser?.likesCount ?? (await getLikesCount(toUserId));

    if (io?.userSockets) {
      const set = io.userSockets.get(String(toUserId));
      if (set) {
        for (const s of set) {
          s.emit('likeUpdate', {
            toUserId: String(toUserId),
            liked: false,
            likesCount,
          });
        }
      }
      io.emit('likeUpdate', {
        toUserId: String(toUserId),
        liked: false,
        likesCount,
      });
    }

    return { removed: true, liked: false, likesCount };
  } catch (err) {
    console.error('unlikeUser error', err);
    throw err;
  }
};

export const isLikedBy = async (fromUserId, toUserId) => {
  if (!fromUserId) return false;

  const doc = await LikeCollection.findOne({
    fromUserId,
    toUserId,
  });

  return Boolean(doc);
};
