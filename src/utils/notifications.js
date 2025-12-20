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
  if (unique) {
    const uniqueQuery = {
      user,
      key,
      ...(relatedPost ? { relatedPost } : {}),
      ...(relatedEvent ? { relatedEvent } : {}),
    };

    if (uniqueMetaKeys.length > 0) {
      uniqueMetaKeys.forEach((k) => {
        if (meta[k] !== undefined) {
          uniqueQuery[`meta.${k}`] = meta[k];
        }
      });
    }

    const exists = await Notification.findOne(uniqueQuery);
    if (exists) return exists;
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

  return doc;
};
