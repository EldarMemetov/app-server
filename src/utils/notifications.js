// import Notification from '../db/models/Notification.js';

// export const createNotification = async ({
//   user,
//   fromUser = null,
//   type = 'info',
//   key,
//   title,
//   message,
//   relatedPost = null,
//   relatedEvent = null,
//   meta = {},
//   scheduledAt = null,
//   unique = false,
//   uniqueMetaKeys = [],
// }) => {
//   if (unique) {
//     const uniqueQuery = {
//       user,
//       key,
//       ...(relatedPost ? { relatedPost } : {}),
//       ...(relatedEvent ? { relatedEvent } : {}),
//     };

//     if (uniqueMetaKeys.length > 0) {
//       uniqueMetaKeys.forEach((k) => {
//         if (meta[k] !== undefined) {
//           uniqueQuery[`meta.${k}`] = meta[k];
//         }
//       });
//     }

//     const exists = await Notification.findOne(uniqueQuery);
//     if (exists) return exists;
//   }

//   const doc = await Notification.create({
//     user,
//     fromUser,
//     type,
//     key,
//     title,
//     message,
//     relatedPost,
//     relatedEvent,
//     meta,
//     scheduledAt,
//   });

//   return doc;
// };
// utils/notifications.js
import Notification from '../db/models/Notification.js';

export const createNotification = async ({
  user,
  fromUser = null,
  type = 'info',
  key,
  title,
  message,
  relatedPost = null,
  relatedEvent = null,
  meta = {},
  scheduledAt = null,
  unique = false,
  uniqueMetaKeys = [],
}) => {
  if (!user) throw new Error('Notification target user is required');

  if (unique) {
    const uniqueQuery = { user };
    if (key) uniqueQuery.key = key;
    if (relatedPost) uniqueQuery.relatedPost = relatedPost;
    if (relatedEvent) uniqueQuery.relatedEvent = relatedEvent;

    if (uniqueMetaKeys.length > 0) {
      uniqueMetaKeys.forEach((k) => {
        if (meta[k] !== undefined) {
          uniqueQuery[`meta.${k}`] = meta[k];
        }
      });
    }

    const setOnInsert = {
      user,
      fromUser,
      type,
      key,
      title,
      message,
      relatedPost,
      relatedEvent,
      meta,
      scheduledAt,
      read: false,
    };

    const doc = await Notification.findOneAndUpdate(
      uniqueQuery,
      { $setOnInsert: setOnInsert },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

    return doc;
  }

  const doc = await Notification.create({
    user,
    fromUser,
    type,
    key,
    title,
    message,
    relatedPost,
    relatedEvent,
    meta,
    scheduledAt,
  });

  return doc.toObject();
};
