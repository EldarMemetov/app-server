import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import validateBody from '../utils/validateBody.js';
import ctrlWrapper from '../utils/ctrlWrapper.js';
import * as profileController from '../controllers/profileController.js';
import { userUpdateProfileSchema } from '../validation/users.js';
import upload from '../middlewares/uploadMiddleware.js';
import * as mediaController from '../controllers/profileMediaController.js';

const router = Router();

router.use(authenticate);

// GET /profile/me
router.get('/me', ctrlWrapper(profileController.getProfileController));

// PATCH /profile
router.patch(
  '/',
  validateBody(userUpdateProfileSchema),
  ctrlWrapper(profileController.updateProfileController),
);

// POST /profile/upload-photo
router.post(
  '/upload-photo',
  upload.single('photo'),
  ctrlWrapper(mediaController.uploadProfilePhotoController),
);

// DELETE /profile/photo
router.delete(
  '/photo',
  ctrlWrapper(mediaController.deleteProfilePhotoController),
);

export default router;
