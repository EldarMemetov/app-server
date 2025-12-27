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

/**
 * Toggle like for a given target (user|post|comment|message).
 * Uses transaction. Emits socket events and creates notification where appropriate.
 */
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
  session.startTransaction();
  try {
    // load target doc if we have mapping
    let targetDoc = null;
    if (map) {
      targetDoc = await map.model.findById(targetId).session(session);
      if (!targetDoc) throw createHttpError(404, `${targetType} not found`);
    }

    // find existing like by unique compound key (fromUserId, targetType, targetId)
    const existing = await LikeCollection.findOne({
      fromUserId,
      targetType,
      targetId,
    }).session(session);

    let liked;
    if (existing) {
      // remove like
      await LikeCollection.deleteOne({ _id: existing._id }).session(session);

      // decrement likesCount on mapped model if exists
      if (map && typeof targetDoc.likesCount !== 'undefined') {
        await map.model.findByIdAndUpdate(
          targetId,
          { $inc: { likesCount: -1 } },
          { new: true, session },
        );
      }

      liked = false;
    } else {
      // create like
      await LikeCollection.create([{ fromUserId, targetType, targetId }], {
        session,
      });

      // increment likesCount on mapped model if exists
      if (map && typeof targetDoc.likesCount !== 'undefined') {
        await map.model.findByIdAndUpdate(
          targetId,
          { $inc: { likesCount: 1 } },
          { new: true, session },
        );
      }

      liked = true;
    }

    // compute likesCount (prefer stored likesCount field if present)
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
    session.endSession();

    // Emit and optionally create notification (outside transaction)
    try {
      const ownerId = map ? map.getOwnerId(targetDoc) : null;

      const payload = {
        targetType,
        targetId: String(targetId),
        liked,
        likesCount,
        fromUserId: String(fromUserId),
      };

      // for compatibility with older frontend that used toUserId for user likes:
      if (targetType === 'user') payload.toUserId = String(targetId);

      // emit to owner's sockets if available
      if (ownerId && io?.userSockets) {
        const set = io.userSockets.get(String(ownerId));
        if (set) {
          for (const s of set) {
            try {
              s.emit('likeUpdate', payload);
            } catch (e) {
              /* ignore per-socket errors */
            }
          }
        }
      }

      // global emit
      if (io) {
        try {
          io.emit('likeUpdate', payload);
        } catch (e) {
          /* ignore */
        }
      }

      // create notification for owner (not when owner === fromUser)
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
    } catch (emitErr) {
      console.error('like emit/notification error:', emitErr);
    }

    return { liked, likesCount };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};
