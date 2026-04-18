import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import { upload } from '../middlewares/upload.js';
import {
  confirmShootingController,
  addReviewController,
  updateReviewController,
  deleteReviewController,
  addResultsController,
  updateResultsController,
  getUserCompletedProjectsController,
  getUserReviewsController,
} from '../controllers/reviewController.js';

const router = Router();

// Подтвердить съёмку (автор)
router.post(
  '/posts/:id/confirm-shooting',
  authenticate,
  confirmShootingController,
);

// Отзывы
router.post('/posts/:id/review', authenticate, addReviewController);
router.patch('/reviews/:reviewId', authenticate, updateReviewController);
router.delete('/reviews/:reviewId', authenticate, deleteReviewController);

// Результаты (автор)
router.post(
  '/posts/:id/results',
  authenticate,
  upload.array('photos', 5),
  addResultsController,
);
router.patch(
  '/posts/:id/results',
  authenticate,
  upload.array('photos', 5),
  updateResultsController,
);

// Профиль пользователя
router.get(
  '/users/:userId/completed-projects',
  getUserCompletedProjectsController,
);
router.get('/users/:userId/reviews', getUserReviewsController);

export default router;
