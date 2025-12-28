import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import { toggleFavoriteController } from '../contacts/favoritesController.js';
import { getMyFavoritesController } from '../contacts/favorites.js';
import ctrlWrapper from '../utils/ctrlWrapper.js';

const router = Router();

router.patch('/toggle', authenticate, toggleFavoriteController);
router.get('/', authenticate, ctrlWrapper(getMyFavoritesController));
export default router;
