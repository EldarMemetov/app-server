import PostCollection from '../db/models/Post.js';
import { createNotification } from '../utils/notifications.js';

export const checkPostStatus = async (post, io = null) => {
  if (!post) return null;

  const now = new Date();

  const allRolesFilled = post.roleSlots.every(
    (slot) => (slot.assigned?.length || 0) >= slot.required,
  );

  let newStatus = post.status;

  if (['shooting_done', 'canceled'].includes(post.status)) {
    return post;
  }

  if (post.hasNoDate || !post.date) {
    newStatus = allRolesFilled ? 'in_progress' : 'open';
  } else {
    const postDate = new Date(post.date);
    const datePassed = postDate < now;

    if (datePassed) {
      if (allRolesFilled) {
        newStatus = 'in_progress';
      } else {
        newStatus = 'expired';

        if (!post.extensionOffered) {
          try {
            await createNotification({
              user: post.author,
              type: 'post',
              key: 'post_expired_extend',
              title: `Пост "${post.title}" истёк`,
              message: 'Команда не собралась. Хотите продлить дату?',
              relatedPost: post._id,
              meta: { postId: post._id, action: 'extend' },
              unique: true,
              uniqueMetaKeys: ['postId', 'action'],
            });

            post.extensionOffered = true;
          } catch (e) {
            console.warn('Failed to send extension notification', e);
          }
        }
      }
    } else {
      newStatus = allRolesFilled ? 'in_progress' : 'open';
    }
  }

  if (newStatus !== post.status || post.isModified('extensionOffered')) {
    post.status = newStatus;
    await post.save();
  }

  return post;
};

export const updateAllPostsStatus = async () => {
  const posts = await PostCollection.find({
    status: { $in: ['open', 'in_progress'] },
  });

  let updatedCount = 0;

  for (const post of posts) {
    const oldStatus = post.status;
    await checkPostStatus(post);
    if (post.status !== oldStatus) updatedCount++;
  }

  return updatedCount;
};

export const checkPostAfterApplication = async (postId) => {
  const post = await PostCollection.findById(postId);
  if (!post) throw new Error('Post not found');

  return checkPostStatus(post);
};
