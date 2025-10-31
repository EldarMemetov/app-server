import PostCollection from '../db/models/Post.js';

export const createPostController = async (req, res) => {
  const { _id: userId } = req.user;
  const post = await PostCollection.create({ ...req.body, author: userId });

  res.status(201).json({
    status: 201,
    message: 'Post created successfully',
    data: post,
  });
};

export const getAllPostsController = async (req, res) => {
  const { roleNeeded, city, type } = req.query;
  const filter = {};

  if (roleNeeded) filter.roleNeeded = { $in: roleNeeded.split(',') };
  if (city) filter.city = city;
  if (type) filter.type = type;

  const posts = await PostCollection.find(filter)
    .populate('author', 'name surname city role photo')
    .sort({ createdAt: -1 });

  res.json({
    status: 200,
    message: 'All posts fetched successfully',
    data: posts,
  });
};

export const getPostByIdController = async (req, res) => {
  const { id } = req.params;

  const post = await PostCollection.findById(id)
    .populate('author', 'name surname city photo role')
    .populate('comments.author', 'name surname photo role');

  if (!post) {
    return res.status(404).json({ message: 'Post not found' });
  }

  res.json({
    status: 200,
    message: 'Post fetched successfully',
    data: post,
  });
};

export const updatePostController = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const post = await PostCollection.findById(id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  if (post.author.toString() !== userId.toString()) {
    return res.status(403).json({ message: 'You can edit only your posts' });
  }

  const updatedPost = await PostCollection.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  res.json({
    status: 200,
    message: 'Post updated successfully',
    data: updatedPost,
  });
};

export const deletePostController = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const post = await PostCollection.findById(id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  if (post.author.toString() !== userId.toString()) {
    return res.status(403).json({ message: 'You can delete only your posts' });
  }

  await PostCollection.findByIdAndDelete(id);
  res.json({
    status: 200,
    message: 'Post deleted successfully',
  });
};

// ❤️ Лайк / убрать лайк
export const toggleLikeController = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const post = await PostCollection.findById(id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  const isLiked = post.likes.includes(userId);

  if (isLiked) {
    post.likes.pull(userId);
  } else {
    post.likes.push(userId);
  }

  await post.save();
  res.json({
    status: 200,
    message: isLiked ? 'Like removed' : 'Post liked',
    likesCount: post.likes.length,
  });
};

// ⭐ Добавить / удалить из избранного
export const toggleFavoriteController = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const post = await PostCollection.findById(id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  const isFav = post.favorites.includes(userId);

  if (isFav) {
    post.favorites.pull(userId);
  } else {
    post.favorites.push(userId);
  }

  await post.save();
  res.json({
    status: 200,
    message: isFav ? 'Removed from favorites' : 'Added to favorites',
  });
};

// 💬 Добавить комментарий
export const addCommentController = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { text } = req.body;

  const post = await PostCollection.findById(id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  post.comments.push({ author: userId, text });
  await post.save();

  res.status(201).json({
    status: 201,
    message: 'Comment added',
    commentsCount: post.comments.length,
  });
};

// 💼 Добавить / убрать заинтересованность
export const toggleInterestedController = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const post = await PostCollection.findById(id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  const isInterested = post.interestedUsers.includes(userId);

  if (isInterested) {
    post.interestedUsers.pull(userId);
  } else {
    post.interestedUsers.push(userId);
  }

  await post.save();
  res.json({
    status: 200,
    message: isInterested ? 'Interest removed' : 'User marked as interested',
    interestedCount: post.interestedUsers.length,
  });
};
export const getFilteredPostsController = async (req, res) => {
  const { city, type, roleNeeded } = req.query;

  const filter = {};
  if (city) filter.city = city;
  if (type) filter.type = type;
  if (roleNeeded) filter.roleNeeded = { $in: roleNeeded.split(',') };

  const posts = await PostCollection.find(filter)
    .populate('author', 'name surname city photo role')
    .sort({ createdAt: -1 });

  res.json({
    status: 200,
    message: 'Filtered posts fetched successfully',
    data: posts,
  });
};
// ✏️ Изменить комментарий
export const updateCommentController = async (req, res) => {
  const { postId, commentId } = req.params;
  const userId = req.user._id;
  const { text } = req.body;

  const post = await PostCollection.findById(postId);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  const comment = post.comments.id(commentId);
  if (!comment) return res.status(404).json({ message: 'Comment not found' });

  if (comment.author.toString() !== userId.toString()) {
    return res.status(403).json({ message: 'You can edit only your comments' });
  }

  comment.text = text;
  await post.save();

  res.json({
    status: 200,
    message: 'Comment updated successfully',
    data: comment,
  });
};
// 🗑 Удалить комментарий
export const deleteCommentController = async (req, res) => {
  const { postId, commentId } = req.params;
  const userId = req.user._id;

  const post = await PostCollection.findById(postId);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  const comment = post.comments.id(commentId);
  if (!comment) return res.status(404).json({ message: 'Comment not found' });

  if (
    comment.author.toString() !== userId.toString() &&
    post.author.toString() !== userId.toString()
  ) {
    return res.status(403).json({
      message: 'You can delete only your comments or your post comments',
    });
  }

  comment.deleteOne();
  await post.save();

  res.json({
    status: 200,
    message: 'Comment deleted successfully',
  });
};
