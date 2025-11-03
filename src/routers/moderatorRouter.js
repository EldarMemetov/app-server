import express from 'express';
import authenticate from '../middlewares/authenticate.js';
import { checkRole } from '../middlewares/checkRole.js';
import ctrlWrapper from '../utils/ctrlWrapper.js';
import * as moderationCtrl from '../contacts/moderation.js';

const router = express.Router();

router.get(
  '/users',
  authenticate,
  checkRole(['moderator', 'admin']),
  ctrlWrapper(moderationCtrl.getAllUsers),
);

router.patch(
  '/users/:id/block',
  authenticate,
  checkRole(['moderator', 'admin']),
  ctrlWrapper(moderationCtrl.blockUser),
);

router.patch(
  '/users/:id/unblock',
  authenticate,
  checkRole(['moderator', 'admin']),
  ctrlWrapper(moderationCtrl.unblockUser),
);

router.delete(
  '/users/:id/photo',
  authenticate,
  checkRole(['moderator', 'admin']),
  ctrlWrapper(moderationCtrl.deleteUserPhoto),
);

router.delete(
  '/users/:id/about',
  authenticate,
  checkRole(['moderator', 'admin']),
  ctrlWrapper(moderationCtrl.clearUserAbout),
);

router.delete(
  '/users/:id/portfolio/:itemId',
  authenticate,
  checkRole(['moderator', 'admin']),
  ctrlWrapper(moderationCtrl.deletePortfolioItem),
);

router.get(
  '/posts',
  authenticate,
  checkRole(['moderator', 'admin']),
  ctrlWrapper(moderationCtrl.getAllPosts),
);

router.delete(
  '/posts/:id',
  authenticate,
  checkRole(['moderator', 'admin']),
  ctrlWrapper(moderationCtrl.deletePost),
);

router.delete(
  '/posts/:postId/comments/:commentId',
  authenticate,
  checkRole(['moderator', 'admin']),
  ctrlWrapper(moderationCtrl.deleteComment),
);

export default router;
