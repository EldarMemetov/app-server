import UserCollection from '../db/models/User.js';
import { createNotification } from '../utils/notifications.js';

export const NotificationService = {
  async like({ fromUserId, targetType, targetDoc }) {
    if (!targetDoc) return;

    const ownerId = targetType === 'user' ? targetDoc._id : targetDoc.author;

    if (!ownerId || String(ownerId) === String(fromUserId)) return;

    const fromUser = await UserCollection.findById(fromUserId).select(
      'name surname',
    );

    const name = fromUser?.name || 'User';
    const surname = fromUser?.surname || '';

    const MAP = {
      user: {
        title: `${name} liked your profile`,
        meta: {
          profileUrl: `/talents/${fromUserId}`,
          fromUserId: String(fromUserId),
        },
      },
      post: {
        title: `${name} liked your post`,
        meta: {
          postUrl: `/posts/${targetDoc._id}`,
          fromUserId: String(fromUserId),
        },
      },
      comment: {
        title: `${name} liked your comment`,
        meta: {
          commentId: String(targetDoc._id),
          fromUserId: String(fromUserId),
        },
      },
    };

    const config = MAP[targetType];
    if (!config) return;

    await createNotification({
      user: ownerId,
      fromUser: fromUserId,
      type: 'like',
      key: `like_${targetType}_${fromUserId}_${targetDoc._id}`,
      title: config.title,
      message: `${name} ${surname}`.trim(),
      meta: config.meta,
      unique: true,
      uniqueMetaKeys: ['fromUserId'],
    });
  },

  async replyToComment({ fromUserId, parentComment, text, postId }) {
    if (!parentComment || String(parentComment.author) === String(fromUserId))
      return;

    await createNotification({
      user: parentComment.author,
      fromUser: fromUserId,
      type: 'comment',
      key: `reply_comment_${parentComment._id}`,
      title: `New reply to your comment`,
      message: text,
      meta: {
        postId: String(postId),
        commentId: String(parentComment._id),
        fromUserId: String(fromUserId),
      },
      unique: true,
      uniqueMetaKeys: ['commentId'],
    });
  },
};
