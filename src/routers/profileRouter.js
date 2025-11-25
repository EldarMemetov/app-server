import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import validateBody from '../utils/validateBody.js';
import ctrlWrapper from '../utils/ctrlWrapper.js';
import * as profileController from '../contacts/profileController.js';
import { userUpdateProfileSchema } from '../validation/users.js';
import upload from '../middlewares/uploadMiddleware.js';
import * as mediaController from '../contacts/profileMediaController.js';
import { filterUsersController } from '../contacts/filterController.js';

const profileRouter = Router();

// ПУБЛИЧНЫЕ РОУТЫ
profileRouter.get('/filter', ctrlWrapper(filterUsersController));
profileRouter.get(
  '/all',
  ctrlWrapper(profileController.getAllProfilesController),
);
profileRouter.get(
  '/:id',
  ctrlWrapper(profileController.getProfileByIdController),
);

//ТОЛЬКО ДЛЯ АВТОРИЗОВАННЫХ
profileRouter.use(authenticate);

profileRouter.get('/me', ctrlWrapper(profileController.getProfileController));

profileRouter.patch(
  '/',
  validateBody(userUpdateProfileSchema),
  ctrlWrapper(profileController.updateProfileController),
);

profileRouter.post(
  '/upload-photo',
  upload.single('photo'),
  ctrlWrapper(mediaController.uploadProfilePhotoController),
);

export default profileRouter;
