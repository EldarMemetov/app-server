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

profileRouter.get('/filter', ctrlWrapper(filterUsersController));

profileRouter.get(
  '/all',
  ctrlWrapper(profileController.getAllProfilesController),
);

// Все руты требуют авторизации
profileRouter.use(authenticate);

profileRouter.get(
  '/me',
  authenticate,
  ctrlWrapper(profileController.getProfileController),
);

// Обновить свой профиль
profileRouter.patch(
  '/',
  validateBody(userUpdateProfileSchema),
  ctrlWrapper(profileController.updateProfileController),
);

// Получить профиль любого пользователя по ID
profileRouter.get(
  '/:id',
  ctrlWrapper(profileController.getProfileByIdController),
);

profileRouter.post(
  '/upload-photo',
  upload.single('photo'),
  ctrlWrapper(mediaController.uploadProfilePhotoController),
);

export default profileRouter;
