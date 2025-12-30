import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import checkBlocked from '../middlewares/checkBlocked.js';
import ctrlWrapper from '../utils/ctrlWrapper.js';
import upload from '../middlewares/uploadMiddleware.js';
import {
  addPortfolioItemController,
  deletePortfolioItemController,
} from '../controllers/portfolioController.js';

const portfolioRouter = Router();

portfolioRouter.post(
  '/',
  authenticate,
  checkBlocked,
  upload.array('files', 10),
  ctrlWrapper(addPortfolioItemController),
);

portfolioRouter.delete(
  '/:itemId',
  authenticate,
  checkBlocked,
  ctrlWrapper(deletePortfolioItemController),
);

export default portfolioRouter;
