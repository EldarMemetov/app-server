import PostCollection from '../db/models/Post.js';
import UserCollection from '../db/models/User.js';
import createHttpError from 'http-errors';
import { saveFileToCloudinary } from '../utils/saveFileToCloudinary.js';
export const createPostWithMediaController = async (req, res) => {
  const { _id: userId } = req.user;
  if (!userId) throw createHttpError(401, 'Unauthorized');

  const postData = { ...req.body, author: userId };
  const newPost = await PostCollection.create(postData);

  if (req.files && req.files.length > 0) {
    const uploadedMedia = [];
    for (const file of req.files) {
      const { url, public_id } = await saveFileToCloudinary(file);

      const type = file.mimetype.startsWith('video') ? 'video' : 'photo';
      uploadedMedia.push({ type, url, public_id });
    }

    newPost.media = uploadedMedia;
    await newPost.save();
  }

  res.status(201).json({
    status: 201,
    message: 'Post created with media successfully',
    data: newPost,
  });
};
export const createPostController = async (req, res) => {
  const { _id: userId } = req.user;

  if (!userId) throw createHttpError(401, 'Unauthorized');

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

  if (!posts || posts.length === 0) {
    throw createHttpError(404, 'No posts found');
  }

  res.json({
    status: 200,
    message: 'Posts fetched successfully',
    data: posts,
  });
};

// 📄 Получить пост по ID
export const getPostByIdController = async (req, res) => {
  const { id } = req.params;

  const post = await PostCollection.findById(id)
    .populate('author', 'name surname city photo role')
    .populate('comments.author', 'name surname photo role');

  if (!post) {
    throw createHttpError(404, 'Post not found');
  }

  res.json({
    status: 200,
    message: 'Post fetched successfully',
    data: post,
  });
};

// ✏️ Обновить пост
export const updatePostController = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const post = await PostCollection.findById(id);
  if (!post) throw createHttpError(404, 'Post not found');

  if (post.author.toString() !== userId.toString()) {
    throw createHttpError(403, 'You can edit only your own posts');
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

// 🗑️ Удалить пост
export const deletePostController = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const post = await PostCollection.findById(id);
  if (!post) throw createHttpError(404, 'Post not found');

  if (post.author.toString() !== userId.toString()) {
    throw createHttpError(403, 'You can delete only your own posts');
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
  if (!post) throw createHttpError(404, 'Post not found');

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
  if (!post) throw createHttpError(404, 'Post not found');

  const isFavorite = post.favorites.includes(userId);

  if (isFavorite) {
    post.favorites.pull(userId);
  } else {
    post.favorites.push(userId);
  }

  await post.save();

  res.json({
    status: 200,
    message: isFavorite ? 'Removed from favorites' : 'Added to favorites',
    favoritesCount: post.favorites.length,
  });
};
/// 💬 Добавить комментарий
export const addCommentController = async (req, res) => {
  const { id } = req.params; // postId
  const userId = req.user._id;
  const { text } = req.body;

  if (!text?.trim()) throw createHttpError(400, 'Comment text is required');

  const post = await PostCollection.findById(id);
  if (!post) throw createHttpError(404, 'Post not found');

  post.comments.push({ author: userId, text });
  await post.save();

  res.status(201).json({
    status: 201,
    message: 'Comment added successfully',
    commentsCount: post.comments.length,
    data: post.comments[post.comments.length - 1], // возвращаем сам комментарий
  });
};

// 💼 Добавить / убрать заинтересованность
export const toggleInterestedController = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const post = await PostCollection.findById(id);
  if (!post) throw createHttpError(404, 'Post not found');

  const isInterested = post.interestedUsers.includes(userId);

  if (isInterested) {
    post.interestedUsers.pull(userId);
  } else {
    post.interestedUsers.push(userId);
  }

  await post.save();

  res.json({
    status: 200,
    message: isInterested
      ? 'Interest removed successfully'
      : 'User marked as interested',
    interestedCount: post.interestedUsers.length,
  });
};

// 🎯 Получить посты по фильтрам
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
    count: posts.length,
    data: posts,
  });
};

// ✏️ Изменить комментарий
export const updateCommentController = async (req, res) => {
  const { postId, commentId } = req.params;
  const userId = req.user._id;
  const { text } = req.body;

  if (!text?.trim()) throw createHttpError(400, 'Comment text is required');

  const post = await PostCollection.findById(postId);
  if (!post) throw createHttpError(404, 'Post not found');

  const comment = post.comments.id(commentId);
  if (!comment) throw createHttpError(404, 'Comment not found');

  if (comment.author.toString() !== userId.toString()) {
    throw createHttpError(403, 'You can edit only your comments');
  }

  comment.text = text;
  comment.updatedAt = new Date();
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
  if (!post) throw createHttpError(404, 'Post not found');

  const comment = post.comments.id(commentId);
  if (!comment) throw createHttpError(404, 'Comment not found');

  // Удалить может либо автор комментария, либо автор поста
  if (
    comment.author.toString() !== userId.toString() &&
    post.author.toString() !== userId.toString()
  ) {
    throw createHttpError(
      403,
      'You can delete only your comments or comments on your posts',
    );
  }

  comment.deleteOne();
  await post.save();

  res.json({
    status: 200,
    message: 'Comment deleted successfully',
  });
};

// ✅ Подать заявку на пост
export const applyToPostController = async (req, res) => {
  const { id } = req.params; // postId
  const userId = req.user._id;
  const { message } = req.body;

  const post = await PostCollection.findById(id);
  if (!post) throw createHttpError(404, 'Post not found');
  if (post.status !== 'open')
    throw createHttpError(400, 'Applications are closed for this post');

  const alreadyApplied = post.candidates.some(
    (c) => c.user.toString() === userId.toString(),
  );
  if (alreadyApplied)
    throw createHttpError(400, 'You already applied to this post');

  post.candidates.push({ user: userId, message });
  await post.save();

  res.status(201).json({
    status: 201,
    message: 'Application submitted successfully',
    data: post.candidates,
  });
};

// ✅ Назначить кандидата
export const assignCandidateController = async (req, res) => {
  const { id, userId } = req.params; // postId, candidate userId
  const currentUserId = req.user._id;

  const post = await PostCollection.findById(id);
  if (!post) throw createHttpError(404, 'Post not found');

  if (post.author.toString() !== currentUserId.toString()) {
    throw createHttpError(403, 'Only the post author can assign candidates');
  }

  const candidateExists = post.candidates.some(
    (c) => c.user.toString() === userId.toString(),
  );
  if (!candidateExists) {
    throw createHttpError(404, 'Candidate not found in this post');
  }

  post.assignedTo = userId;
  post.status = 'in_progress';
  await post.save();

  res.json({
    status: 200,
    message: 'Candidate assigned and post moved to in_progress',
    data: post,
  });
};

// ✅ Завершить пост и начислить рейтинг
export const completePostController = async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user._id;

  const post = await PostCollection.findById(id);
  if (!post) throw createHttpError(404, 'Post not found');

  if (post.author.toString() !== currentUserId.toString()) {
    throw createHttpError(403, 'Only the post author can complete it');
  }

  if (post.status !== 'in_progress') {
    throw createHttpError(400, 'Post is not in progress');
  }

  post.status = 'completed';
  await post.save();

  // 🎯 Начисляем рейтинг
  if (post.assignedTo) {
    await UserCollection.findByIdAndUpdate(post.assignedTo, {
      $inc: { rating: 10 },
    });
    await UserCollection.findByIdAndUpdate(post.author, {
      $inc: { rating: 5 },
    });
  }

  res.json({
    status: 200,
    message: 'Post completed and ratings updated',
    data: post,
  });
};
