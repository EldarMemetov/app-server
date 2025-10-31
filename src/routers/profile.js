import express from 'express';
import {
  deleteProfilePhotoController,
  deleteAboutController,
  deletePortfolioItemController,
} from '../contacts/profileDelete.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = express.Router();

router.delete('/photo', authenticate, deleteProfilePhotoController);
router.delete('/about', authenticate, deleteAboutController);
router.delete(
  '/portfolio/:itemId',
  authenticate,
  deletePortfolioItemController,
);

export default router;
