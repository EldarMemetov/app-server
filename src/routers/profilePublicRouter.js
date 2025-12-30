// profilePublicRouter.js
import { Router } from 'express';
import ctrlWrapper from '../utils/ctrlWrapper.js';
import * as profileController from '../controllers/profileController.js';
import { filterUsersController } from '../controllers/filterController.js';

import authenticate from '../middlewares/authenticate.js';
import optionalAuthenticate from '../middlewares/optionalAuthenticate.js';
import * as likesController from '../controllers/likesController.js';

const router = Router();

router.get('/filter', ctrlWrapper(filterUsersController));
router.get('/all', ctrlWrapper(profileController.getAllProfilesController));

router.get('/:id', ctrlWrapper(profileController.getProfileByIdController));

router.get(
  '/:id/like',
  optionalAuthenticate,
  ctrlWrapper(likesController.getLikeStatusController),
);

router.post(
  '/:id/like',
  authenticate,
  ctrlWrapper(likesController.likeUserController),
);

router.delete(
  '/:id/like',
  authenticate,
  ctrlWrapper(likesController.unlikeUserController),
);

export default router;
