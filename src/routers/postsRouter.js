import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import validateBody from '../utils/validateBody.js';
import ctrlWrapper from '../utils/ctrlWrapper.js';
import * as postsController from '../contacts/posts.js';
import { createPostSchema, applySchema } from '../validation/posts.js';
import {
  addCommentSchema,
  updateCommentSchema,
} from '../validation/comments.js';

import checkBlocked from '../middlewares/checkBlocked.js';
import * as postMediaController from '../controllers/postMediaController.js';
import upload from '../middlewares/uploadMiddleware.js';
import { filterPostsController } from '../controllers/filterController.js';
import * as postNotifications from '../contacts/postNotifications.js';

import optionalAuthenticate from '../middlewares/optionalAuthenticate.js';

import * as commentsController from '../controllers/commentsController.js';

import * as likesController from '../controllers/likesController.js';

import * as commentLikesController from '../controllers/commentLikesController.js';

const postsRouter = Router();

postsRouter.get('/filter', ctrlWrapper(filterPostsController));
postsRouter.get(
  '/',
  optionalAuthenticate,
  ctrlWrapper(postsController.getAllPostsController),
);
postsRouter.get(
  '/mine',
  authenticate,
  ctrlWrapper(postsController.getMyPostsController),
);
postsRouter.get(
  '/:id',
  optionalAuthenticate,
  ctrlWrapper(postsController.getPostByIdController),
);

postsRouter.get(
  '/:id/like',
  optionalAuthenticate,
  ctrlWrapper(likesController.getPostLikeStatusController),
);

postsRouter.post(
  '/add',
  authenticate,
  checkBlocked,
  validateBody(createPostSchema),
  ctrlWrapper(postsController.createPostController),
);

postsRouter.patch(
  '/:id/like',
  authenticate,
  checkBlocked,
  ctrlWrapper(postsController.toggleLikeController),
);

postsRouter.post(
  '/',
  authenticate,
  checkBlocked,
  upload.array('files', 5),
  ctrlWrapper(postsController.createPostWithMediaController),
);

postsRouter.patch(
  '/:id',
  authenticate,
  checkBlocked,
  ctrlWrapper(postsController.updatePostController),
);
postsRouter.delete(
  '/:id',
  authenticate,
  checkBlocked,
  ctrlWrapper(postsController.deletePostController),
);
postsRouter.delete(
  '/:id/media/:mediaId',
  authenticate,
  checkBlocked,
  ctrlWrapper(postMediaController.deletePostMediaController),
);
postsRouter.post(
  '/:id/comment',
  authenticate,
  checkBlocked,
  validateBody(addCommentSchema),
  ctrlWrapper(commentsController.addCommentController),
);

postsRouter.get(
  '/:id/comments',
  optionalAuthenticate,
  ctrlWrapper(commentsController.getCommentsController),
);

postsRouter.patch(
  '/:postId/comments/:commentId',
  authenticate,
  checkBlocked,
  validateBody(updateCommentSchema),
  ctrlWrapper(commentsController.updateCommentController),
);

postsRouter.delete(
  '/:postId/comments/:commentId',
  authenticate,
  checkBlocked,
  ctrlWrapper(commentsController.deleteCommentController),
);

postsRouter.patch(
  '/:postId/comments/:commentId/like',
  authenticate,
  checkBlocked,
  ctrlWrapper(commentLikesController.toggleCommentLikeController),
);

postsRouter.patch(
  '/:id/interested',
  authenticate,
  checkBlocked,
  ctrlWrapper(postsController.toggleInterestedController),
);

postsRouter.patch(
  '/:id/apply',
  authenticate,
  checkBlocked,
  validateBody(applySchema),
  ctrlWrapper(postNotifications.applyToPostController),
);

postsRouter.patch(
  '/:id/assign',
  authenticate,
  checkBlocked,
  ctrlWrapper(postNotifications.assignCandidateController),
);

postsRouter.patch(
  '/:id/complete',
  authenticate,
  checkBlocked,
  ctrlWrapper(postNotifications.completePostController),
);
postsRouter.post(
  '/:id/media',
  authenticate,
  checkBlocked,
  upload.array('files', 5),
  ctrlWrapper(postMediaController.uploadPostMediaController),
);

export default postsRouter;
