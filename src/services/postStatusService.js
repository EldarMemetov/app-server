import PostCollection from '../db/models/Post.js';

export const checkPostStatus = async (post) => {
  if (!post) return null;

  const now = new Date();

  const allRolesFilled = post.roleSlots.every(
    (slot) => (slot.assigned?.length || 0) >= slot.required,
  );

  let newStatus = post.status;

  if (post.date) {
    const postDate = new Date(post.date);
    const datePassed = postDate < now;

    if (datePassed) {
      if (allRolesFilled) {
        newStatus = 'completed';
      } else {
        newStatus = 'canceled';
      }
    } else {
      if (allRolesFilled) {
        newStatus = 'in_progress';
      } else {
        newStatus = 'open';
      }
    }
  } else {
    newStatus = allRolesFilled ? 'in_progress' : 'open';
  }

  if (newStatus !== post.status) {
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
