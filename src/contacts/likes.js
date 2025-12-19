// import LikeCollection from '../db/models/like.js';
// import UserCollection from '../db/models/User.js';
// import createHttpError from 'http-errors';
// import mongoose from 'mongoose';

// export const getLikesCount = async (toUserId) => {
//   const user = await UserCollection.findById(toUserId).select('likesCount');
//   return user ? user.likesCount ?? 0 : 0;
// };

// export const isLikedBy = async (fromUserId, toUserId) => {
//   if (!fromUserId) return false;
//   const doc = await LikeCollection.findOne({ fromUserId, toUserId });
//   return !!doc;
// };

// export const likeUser = async (fromUserId, toUserId, io = null) => {
//   if (!mongoose.Types.ObjectId.isValid(toUserId)) {
//     throw createHttpError(400, 'Invalid target id');
//   }
//   if (fromUserId.toString() === toUserId.toString()) {
//     throw createHttpError(400, 'Нельзя лайкать себя');
//   }

//   try {
//     const exists = await LikeCollection.findOne({ fromUserId, toUserId });

//     if (exists) {
//       const likesCount = await getLikesCount(toUserId);
//       return { liked: true, likesCount };
//     }

//     await LikeCollection.create({ fromUserId, toUserId });

//     await UserCollection.findByIdAndUpdate(toUserId, {
//       $inc: { likesCount: 1 },
//     });

//     if (io?.userSockets) {
//       const set = io.userSockets.get(String(toUserId));
//       if (set) {
//         for (const s of set) {
//           s.emit('likeUpdate', { toUserId: String(toUserId), liked: true });
//         }
//       }
//     }

//     const likesCount = await getLikesCount(toUserId);
//     return { liked: true, likesCount };
//   } catch (err) {
//     console.error('likeUser error', err);

//     throw err;
//   }
// };

// export const unlikeUser = async (fromUserId, toUserId, io = null) => {
//   if (!mongoose.Types.ObjectId.isValid(toUserId)) {
//     throw createHttpError(400, 'Invalid target id');
//   }

//   try {
//     const deleted = await LikeCollection.findOneAndDelete({
//       fromUserId,
//       toUserId,
//     });

//     if (!deleted) {
//       const likesCount = await getLikesCount(toUserId);
//       return { removed: false, liked: false, likesCount };
//     }

//     await UserCollection.findByIdAndUpdate(toUserId, {
//       $inc: { likesCount: -1 },
//     });

//     if (io?.userSockets) {
//       const set = io.userSockets.get(String(toUserId));
//       if (set) {
//         for (const s of set) {
//           s.emit('likeUpdate', { toUserId: String(toUserId), liked: false });
//         }
//       }
//     }

//     const likesCount = await getLikesCount(toUserId);
//     return { removed: true, liked: false, likesCount };
//   } catch (err) {
//     console.error('unlikeUser error', err);
//     throw err;
//   }
// };

import LikeCollection from '../db/models/like.js';
import UserCollection from '../db/models/User.js';
import createHttpError from 'http-errors';
import mongoose from 'mongoose';

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
    // если уже есть — вернем текущее значение
    const exists = await LikeCollection.findOne({ fromUserId, toUserId });
    if (exists) {
      const likesCount = await getLikesCount(toUserId);
      // broadcast
      if (io) {
        const payload = { toUserId: String(toUserId), liked: true, likesCount };
        const set = io.userSockets?.get(String(toUserId));
        if (set) for (const s of set) s.emit('likeUpdate', payload);
        io.emit('likeUpdate', payload);
      }
      return { liked: true, likesCount };
    }

    // пробуем создать; если duplicate -> считаем как already liked
    try {
      await LikeCollection.create({ fromUserId, toUserId });
    } catch (err) {
      if (err?.code === 11000) {
        const likesCount = await getLikesCount(toUserId);
        if (io) {
          const payload = {
            toUserId: String(toUserId),
            liked: true,
            likesCount,
          };
          const set = io.userSockets?.get(String(toUserId));
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

    if (io) {
      const payload = { toUserId: String(toUserId), liked: true, likesCount };
      const set = io.userSockets?.get(String(toUserId));
      if (set) for (const s of set) s.emit('likeUpdate', payload);
      io.emit('likeUpdate', payload);
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
