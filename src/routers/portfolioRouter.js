import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import checkBlocked from '../middlewares/checkBlocked.js';
import ctrlWrapper from '../utils/ctrlWrapper.js';
import upload from '../middlewares/uploadMiddleware.js';
import validateBody from '../utils/validateBody.js';
import { heroModeSchema } from '../validation/users.js';
import {
  setHeroModeController,
  uploadHeroMediaController,
  deleteHeroMediaItemController,
  clearHeroController,
} from '../controllers/portfolioController.js';

const portfolioRouter = Router();

// Сменить режим (showreel/slideshow/cover/null) — старые файлы удалятся
portfolioRouter.patch(
  '/mode',
  authenticate,
  checkBlocked,
  validateBody(heroModeSchema),
  ctrlWrapper(setHeroModeController),
);

// Загрузить файл(ы) под текущий режим
portfolioRouter.post(
  '/',
  authenticate,
  checkBlocked,
  upload.array('files', 5),
  ctrlWrapper(uploadHeroMediaController),
);

// Удалить один файл
portfolioRouter.delete(
  '/:itemId',
  authenticate,
  checkBlocked,
  ctrlWrapper(deleteHeroMediaItemController),
);

// Полностью очистить (mode=null, media=[])
portfolioRouter.delete(
  '/',
  authenticate,
  checkBlocked,
  ctrlWrapper(clearHeroController),
);

export default portfolioRouter;
