import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import validateBody from '../utils/validateBody.js';
import ctrlWrapper from '../utils/ctrlWrapper.js';
import * as postsController from '../contacts/posts.js';
import { addCommentSchema, createPostSchema } from '../validation/posts.js';

const postsRouter = Router();

postsRouter.get('/', ctrlWrapper(postsController.getAllPostsController));
postsRouter.get('/:id', ctrlWrapper(postsController.getPostByIdController));

postsRouter.post(
  '/',
  authenticate,
  validateBody(createPostSchema),
  ctrlWrapper(postsController.createPostController),
);
postsRouter.patch(
  '/:id',
  authenticate,
  ctrlWrapper(postsController.updatePostController),
);
postsRouter.delete(
  '/:id',
  authenticate,
  ctrlWrapper(postsController.deletePostController),
);

postsRouter.patch(
  '/:id/like',
  authenticate,
  ctrlWrapper(postsController.toggleLikeController),
);
postsRouter.patch(
  '/:id/favorite',
  authenticate,
  ctrlWrapper(postsController.toggleFavoriteController),
);
postsRouter.post(
  '/:id/comment',
  authenticate,
  validateBody(addCommentSchema),
  ctrlWrapper(postsController.addCommentController),
);
postsRouter.patch(
  '/:id/interested',
  authenticate,
  ctrlWrapper(postsController.toggleInterestedController),
);
postsRouter.patch(
  '/:postId/comments/:commentId',
  authenticate,
  validateBody(addCommentSchema),
  ctrlWrapper(postsController.updateCommentController),
);

postsRouter.delete(
  '/:postId/comments/:commentId',
  authenticate,
  postsController.deleteCommentController,
);

export default postsRouter;
