import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import validateBody from '../utils/validateBody.js';
import ctrlWrapper from '../utils/ctrlWrapper.js';
import * as postsController from '../contacts/posts.js';
import { addCommentSchema, createPostSchema } from '../validation/posts.js';
import { applySchema } from '../validation/posts.js';
import checkBlocked from '../middlewares/checkBlocked.js';
import * as postMediaController from '../contacts/postMediaController.js';
import upload from '../middlewares/uploadMiddleware.js';
import { filterPostsController } from '../contacts/filterController.js';
const postsRouter = Router();
postsRouter.get('/filter', ctrlWrapper(filterPostsController));
postsRouter.get('/', ctrlWrapper(postsController.getAllPostsController));
postsRouter.get('/:id', ctrlWrapper(postsController.getPostByIdController));

postsRouter.post(
  '/add',
  authenticate,
  checkBlocked,
  validateBody(createPostSchema),
  ctrlWrapper(postsController.createPostController),
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

postsRouter.patch(
  '/:id/like',
  authenticate,
  checkBlocked,
  ctrlWrapper(postsController.toggleLikeController),
);
postsRouter.patch(
  '/:id/favorite',
  authenticate,
  checkBlocked,
  ctrlWrapper(postsController.toggleFavoriteController),
);
postsRouter.post(
  '/:id/comment',
  authenticate,
  checkBlocked,
  validateBody(addCommentSchema),
  ctrlWrapper(postsController.addCommentController),
);
postsRouter.patch(
  '/:id/interested',
  authenticate,
  checkBlocked,
  ctrlWrapper(postsController.toggleInterestedController),
);
postsRouter.patch(
  '/:postId/comments/:commentId',
  authenticate,
  checkBlocked,
  validateBody(addCommentSchema),
  ctrlWrapper(postsController.updateCommentController),
);

postsRouter.delete(
  '/:postId/comments/:commentId',
  authenticate,
  checkBlocked,
  postsController.deleteCommentController,
);

postsRouter.patch(
  '/:id/apply',
  authenticate,
  checkBlocked,
  validateBody(applySchema),
  ctrlWrapper(postsController.applyToPostController),
);

postsRouter.patch(
  '/:id/assign/:userId',
  authenticate,
  checkBlocked,
  ctrlWrapper(postsController.assignCandidateController),
);

postsRouter.patch(
  '/:id/complete',
  authenticate,
  checkBlocked,
  ctrlWrapper(postsController.completePostController),
);
postsRouter.post(
  '/:id/media',
  authenticate,
  checkBlocked,
  upload.array('files', 5),
  ctrlWrapper(postMediaController.uploadPostMediaController),
);

export default postsRouter;
