import { toggleLike } from './likesGeneric.js';
import LikeCollection from '../db/models/like.js';
import UserCollection from '../db/models/User.js';

import mongoose from 'mongoose';

export const likeUser = async (fromUserId, toUserId, io = null) => {
  const { liked, likesCount } = await toggleLike({
    fromUserId,
    targetType: 'user',
    targetId: toUserId,
    io,
  });
  return { liked, likesCount };
};

export const unlikeUser = async (fromUserId, toUserId, io = null) => {
  const { liked, likesCount } = await toggleLike({
    fromUserId,
    targetType: 'user',
    targetId: toUserId,
    io,
  });
  return { removed: !liked, liked, likesCount };
};

export const isLikedBy = async (fromUserId, toUserId) => {
  if (!fromUserId) return false;
  const doc = await LikeCollection.findOne({
    fromUserId,
    targetType: 'user',
    targetId: toUserId,
  });
  return Boolean(doc);
};

export const getLikesCount = async (toUserId) => {
  if (!mongoose.Types.ObjectId.isValid(toUserId)) return 0;

  const user = await UserCollection.findById(toUserId).select('likesCount');
  if (user && typeof user.likesCount === 'number') return user.likesCount;

  return LikeCollection.countDocuments({
    targetType: 'user',
    targetId: toUserId,
  });
};
