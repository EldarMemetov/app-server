import UserCollection from '../db/models/User.js';
import PostCollection from '../db/models/Post.js';
import createHttpError from 'http-errors';

export const getAllUsers = async (req, res) => {
  const users = await UserCollection.find().select('-password');
  res.json({ status: 200, message: 'All users fetched', data: users });
};

export const blockUser = async (req, res) => {
  const user = await UserCollection.findByIdAndUpdate(
    req.params.id,
    { isBlocked: true },
    { new: true },
  );
  if (!user) throw createHttpError(404, 'User not found');
  res.json({ status: 200, message: 'User blocked', data: user });
};

export const unblockUser = async (req, res) => {
  const user = await UserCollection.findByIdAndUpdate(
    req.params.id,
    { isBlocked: false },
    { new: true },
  );
  if (!user) throw createHttpError(404, 'User not found');
  res.json({ status: 200, message: 'User unblocked', data: user });
};

export const deleteUserPhoto = async (req, res) => {
  const user = await UserCollection.findByIdAndUpdate(
    req.params.id,
    { photo: '' },
    { new: true },
  );
  if (!user) throw createHttpError(404, 'User not found');
  res.json({ status: 200, message: 'Profile photo deleted', data: user });
};

export const clearUserAbout = async (req, res) => {
  const user = await UserCollection.findByIdAndUpdate(
    req.params.id,
    { aboutMe: '', experience: '' },
    { new: true },
  );
  if (!user) throw createHttpError(404, 'User not found');
  res.json({ status: 200, message: 'About section cleared', data: user });
};

export const deletePortfolioItem = async (req, res) => {
  const { id, itemId } = req.params;
  const user = await UserCollection.findByIdAndUpdate(
    id,
    { $pull: { portfolio: { _id: itemId } } },
    { new: true },
  );
  if (!user) throw createHttpError(404, 'User not found');
  res.json({ status: 200, message: 'Portfolio item deleted', data: user });
};

export const getAllPosts = async (req, res) => {
  const posts = await PostCollection.find();
  res.json({ status: 200, message: 'All posts fetched', data: posts });
};

export const deletePost = async (req, res) => {
  const post = await PostCollection.findByIdAndDelete(req.params.id);
  if (!post) throw createHttpError(404, 'Post not found');
  res.json({ status: 200, message: 'Post deleted successfully' });
};

export const deleteComment = async (req, res) => {
  const { postId, commentId } = req.params;
  const post = await PostCollection.findByIdAndUpdate(
    postId,
    { $pull: { comments: { _id: commentId } } },
    { new: true },
  );
  if (!post) throw createHttpError(404, 'Post or comment not found');
  res.json({ status: 200, message: 'Comment deleted', data: post });
};
