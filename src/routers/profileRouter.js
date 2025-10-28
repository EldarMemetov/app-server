import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import validateBody from '../utils/validateBody.js';
import ctrlWrapper from '../utils/ctrlWrapper.js';
import * as profileController from '../contacts/profileController.js';
import { userUpdateProfileSchema } from '../validation/users.js';

const profileRouter = Router();

profileRouter.use(authenticate);

profileRouter.get('/', ctrlWrapper(profileController.getProfileController));

profileRouter.patch(
  '/',
  validateBody(userUpdateProfileSchema),
  ctrlWrapper(profileController.updateProfileController),
);

profileRouter.get(
  '/all',
  ctrlWrapper(profileController.getAllProfilesController),
);

export default profileRouter;
