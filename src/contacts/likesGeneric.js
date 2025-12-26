// contacts/likesGeneric.js
import mongoose from 'mongoose';
import createHttpError from 'http-errors';
import LikeCollection from '../db/models/like.js';
import UserCollection from '../db/models/User.js';
import PostCollection from '../db/models/Post.js';
import { createNotification } from '../utils/notifications.js';

const TARGET_MAP = {
  user: { model: UserCollection, getOwnerId: (doc) => doc._id },
  post: { model: PostCollection, getOwnerId: (doc) => doc.author },
};

export const toggleLike = async ({
  fromUserId,
  targetType,
  targetId,
  io = null,
}) => {
  if (!['user', 'post', 'comment', 'message'].includes(targetType)) {
    throw createHttpError(400, 'Invalid targetType');
  }
  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    throw createHttpError(400, 'Invalid targetId');
  }
  if (targetType === 'user' && String(fromUserId) === String(targetId)) {
    throw createHttpError(400, 'You cannot like yourself');
  }

  const map = TARGET_MAP[targetType];

  try {
    let targetDoc = null;
    if (map) {
      targetDoc = await map.model.findById(targetId).lean();
      if (!targetDoc) throw createHttpError(404, `${targetType} not found`);
    }

    const existing = await LikeCollection.findOne({
      fromUserId,
      targetType,
      targetId,
    });

    let liked = false;

    if (existing) {
      await LikeCollection.deleteOne({ _id: existing._id });

      if (map) {
        await map.model
          .findByIdAndUpdate(
            targetId,
            { $inc: { likesCount: -1 } },
            { new: true },
          )
          .catch(() => {});
      }
      liked = false;
    } else {
      try {
        await LikeCollection.create({ fromUserId, targetType, targetId });
      } catch (err) {
        if (err?.code === 11000) {
          liked = true;
        } else {
          throw err;
        }
      }

      if (!liked && map) {
        await map.model
          .findByIdAndUpdate(
            targetId,
            { $inc: { likesCount: 1 } },
            { new: true },
          )
          .catch(() => {});
      }
      liked = true;
    }

    let likesCount;
    if (map) {
      const refreshed = await map.model
        .findById(targetId)
        .select('likesCount')
        .lean();
      if (typeof refreshed?.likesCount === 'number') {
        likesCount = refreshed.likesCount;
      } else {
        likesCount = await LikeCollection.countDocuments({
          targetType,
          targetId,
        });
      }
    } else {
      likesCount = await LikeCollection.countDocuments({
        targetType,
        targetId,
      });
    }

    try {
      const ownerId = map ? map.getOwnerId(targetDoc) : null;
      const payload = {
        targetType,
        targetId: String(targetId),
        liked,
        likesCount,
        fromUserId: String(fromUserId),
        toUserId: targetType === 'user' ? String(targetId) : undefined,
      };

      if (ownerId && io?.userSockets) {
        const set = io.userSockets.get(String(ownerId));
        if (set) for (const s of set) s.emit('likeUpdate', payload);
      }
      if (io && typeof io.emit === 'function') io.emit('likeUpdate', payload);

      if (ownerId && String(ownerId) !== String(fromUserId)) {
        const fromUser = await UserCollection.findById(fromUserId)
          .select('name surname photo')
          .lean();
        let title = '',
          message = '',
          meta = {};
        if (targetType === 'user') {
          title = `${fromUser?.name || 'User'} liked your profile`;
          message = `${fromUser?.name || ''} ${fromUser?.surname || ''}`.trim();
          meta = {
            profileUrl: `/talents/${String(fromUserId)}`,
            fromUserId: String(fromUserId),
          };
        } else if (targetType === 'post') {
          title = `${fromUser?.name || 'User'} liked your post`;
          message = `${fromUser?.name || ''} ${fromUser?.surname || ''}`.trim();
          meta = {
            postUrl: `/posts/${String(targetId)}`,
            fromUserId: String(fromUserId),
          };
        }
        try {
          await createNotification({
            user: ownerId,
            fromUser: fromUserId,
            type: 'like',
            key: `like_${targetType}_${String(fromUserId)}_${String(
              targetId,
            )}_${Date.now()}`,
            title,
            message,
            meta,
            unique: false,
          });
        } catch (e) {
          console.error('Failed to create notification (like):', e);
        }
      }
    } catch (e) {
      console.error('like emit/notification error:', e);
    }

    return { liked, likesCount };
  } catch (err) {
    console.error('toggleLike error:', err);
    throw err;
  }
};
