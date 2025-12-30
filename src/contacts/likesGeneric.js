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
  if (!fromUserId) throw createHttpError(401, 'User not authenticated');
  if (targetType === 'user' && String(fromUserId) === String(targetId)) {
    throw createHttpError(400, 'You cannot like yourself');
  }

  const map = TARGET_MAP[targetType] || null;

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    let targetDoc = null;
    if (map) {
      targetDoc = await map.model.findById(targetId).session(session);
      if (!targetDoc) throw createHttpError(404, `${targetType} not found`);
    }

    const existing = await LikeCollection.findOne({
      fromUserId,
      targetType,
      targetId,
    }).session(session);

    let liked;
    if (existing) {
      await LikeCollection.deleteOne({ _id: existing._id }).session(session);

      if (map && typeof targetDoc.likesCount !== 'undefined') {
        await map.model.findByIdAndUpdate(
          targetId,
          { $inc: { likesCount: -1 } },
          { new: true, session },
        );
      }
      liked = false;
    } else {
      await LikeCollection.create([{ fromUserId, targetType, targetId }], {
        session,
      });

      if (map && typeof targetDoc.likesCount !== 'undefined') {
        await map.model.findByIdAndUpdate(
          targetId,
          { $inc: { likesCount: 1 } },
          { new: true, session },
        );
      }
      liked = true;
    }

    let likesCount;
    if (map) {
      const refreshed = await map.model
        .findById(targetId)
        .select('likesCount')
        .session(session);
      if (typeof refreshed?.likesCount === 'number') {
        likesCount = refreshed.likesCount;
      } else {
        likesCount = await LikeCollection.countDocuments({
          targetType,
          targetId,
        }).session(session);
      }
    } else {
      likesCount = await LikeCollection.countDocuments({
        targetType,
        targetId,
      }).session(session);
    }

    await session.commitTransaction();

    try {
      const ownerId = map ? map.getOwnerId(targetDoc) : null;

      const payload = {
        targetType,
        targetId: String(targetId),
        liked,
        likesCount,
        fromUserId: String(fromUserId),
      };
      if (targetType === 'user') payload.toUserId = String(targetId);

      if (io?.sendLikeUpdate) {
        io.sendLikeUpdate(payload, ownerId);
      }

      if (ownerId && String(ownerId) !== String(fromUserId)) {
        const fromUser = await UserCollection.findById(fromUserId).select(
          'name surname photo',
        );

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

        const notifKey = `like_${targetType}_${String(fromUserId)}_${String(
          targetId,
        )}`;

        await createNotification({
          user: ownerId,
          fromUser: fromUserId,
          type: 'like',
          key: notifKey,
          title,
          message,
          meta,
          unique: true,
          uniqueMetaKeys: ['fromUserId'],
        });
      }
    } catch (emitErr) {
      console.error('like emit/notification error:', emitErr);
    }

    return { liked, likesCount };
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch (e) {
      console.error('abortTransaction failed', e);
    }
    throw err;
  } finally {
    session.endSession();
  }
};
