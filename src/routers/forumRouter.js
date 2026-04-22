import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import optionalAuthenticate from '../middlewares/optionalAuthenticate.js';
import checkBlocked from '../middlewares/checkBlocked.js';
import validateBody from '../utils/validateBody.js';
import ctrlWrapper from '../utils/ctrlWrapper.js';

import {
  createTopicSchema,
  updateTopicSchema,
  moderateTopicSchema,
} from '../validation/forum.js';
import {
  addCommentSchema,
  updateCommentSchema,
} from '../validation/comments.js';

import * as forumController from '../controllers/forumController.js';
import * as forumLikesController from '../controllers/forumLikesController.js';
import * as commentsController from '../controllers/commentsController.js';
import * as commentLikesController from '../controllers/commentLikesController.js';

const forumRouter = Router();

// --- Topics ---
forumRouter.get(
  '/',
  optionalAuthenticate,
  ctrlWrapper(forumController.getTopicsController),
);

forumRouter.post(
  '/',
  authenticate,
  checkBlocked,
  validateBody(createTopicSchema),
  ctrlWrapper(forumController.createTopicController),
);

forumRouter.get(
  '/:id',
  optionalAuthenticate,
  ctrlWrapper(forumController.getTopicByIdController),
);

forumRouter.patch(
  '/:id',
  authenticate,
  checkBlocked,
  validateBody(updateTopicSchema),
  ctrlWrapper(forumController.updateTopicController),
);

forumRouter.delete(
  '/:id',
  authenticate,
  checkBlocked,
  ctrlWrapper(forumController.deleteTopicController),
);

forumRouter.patch(
  '/:id/like',
  authenticate,
  checkBlocked,
  ctrlWrapper(forumLikesController.toggleTopicLikeController),
);

forumRouter.patch(
  '/:id/moderate',
  authenticate,
  validateBody(moderateTopicSchema),
  ctrlWrapper(forumController.moderateTopicController),
);

forumRouter.post(
  '/:id/comment',
  authenticate,
  checkBlocked,
  validateBody(addCommentSchema),
  ctrlWrapper(commentsController.addCommentController),
);

forumRouter.get(
  '/:id/comments',
  optionalAuthenticate,
  ctrlWrapper(commentsController.getCommentsController),
);

forumRouter.patch(
  '/:topicId/comments/:commentId',
  authenticate,
  checkBlocked,
  validateBody(updateCommentSchema),
  ctrlWrapper(commentsController.updateCommentController),
);

forumRouter.delete(
  '/:topicId/comments/:commentId',
  authenticate,
  checkBlocked,
  ctrlWrapper(commentsController.deleteCommentController),
);

forumRouter.patch(
  '/:topicId/comments/:commentId/like',
  authenticate,
  checkBlocked,
  ctrlWrapper(commentLikesController.toggleCommentLikeController),
);

export default forumRouter;
