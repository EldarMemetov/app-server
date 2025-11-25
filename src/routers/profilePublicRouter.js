import { Router } from 'express';
import ctrlWrapper from '../utils/ctrlWrapper.js';
import * as profileController from '../contacts/profileController.js';
import { filterUsersController } from '../contacts/filterController.js';

const router = Router();

router.get('/filter', ctrlWrapper(filterUsersController));
router.get('/all', ctrlWrapper(profileController.getAllProfilesController));
router.get('/:id', ctrlWrapper(profileController.getProfileByIdController));

export default router;
